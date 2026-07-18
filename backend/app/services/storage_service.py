"""Storage service for file operations."""
import uuid
from typing import Optional
from datetime import timedelta

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.config import get_settings

settings = get_settings()


class StorageService:
    """Service for file storage operations (S3/MinIO)."""

    def __init__(self):
        self.bucket_name = settings.aws_bucket_name
        self.endpoint_url = settings.aws_endpoint_url

        if not self.bucket_name:
            raise ValueError("AWS_BUCKET_NAME is required for storage operations")

        # Configure boto3 client
        config = Config(
            retries={"max_attempts": 3, "mode": "standard"},
        )

        session_kwargs = {
            "config": config,
        }

        if settings.aws_access_key_id and settings.aws_secret_access_key:
            session_kwargs["aws_access_key_id"] = settings.aws_access_key_id
            session_kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
            session_kwargs["region_name"] = settings.aws_region

        if self.endpoint_url:
            session_kwargs["endpoint_url"] = self.endpoint_url

        self.s3_client = boto3.client("s3", **session_kwargs)

    def _get_storage_key(self, user_id: uuid.UUID, filename: str, path: str = "") -> str:
        """Generate a storage key for a file."""
        file_id = uuid.uuid4()
        safe_filename = filename.replace(" ", "_")

        if path:
            return f"users/{user_id}/{path}/{file_id}_{safe_filename}"
        return f"users/{user_id}/{file_id}_{safe_filename}"

    async def generate_presigned_upload_url(
        self,
        user_id: uuid.UUID,
        filename: str,
        content_type: str,
        path: str = "",
        expiration: int = 3600,
    ) -> dict:
        """Generate a presigned URL for direct upload."""
        storage_key = self._get_storage_key(user_id, filename, path)

        try:
            response = self.s3_client.generate_presigned_post(
                Bucket=self.bucket_name,
                Key=storage_key,
                Fields={"Content-Type": content_type},
                Conditions=[
                    {"Content-Type": content_type},
                    ["content-length-range", 0, settings.max_upload_size],
                ],
                ExpiresIn=expiration,
            )
            return {
                "url": response["url"],
                "fields": response["fields"],
                "storage_key": storage_key,
            }
        except ClientError as e:
            raise Exception(f"Failed to generate presigned URL: {str(e)}")

    async def generate_presigned_download_url(
        self,
        storage_key: str,
        expiration: int = 3600,
        filename: Optional[str] = None,
    ) -> str:
        """Generate a presigned URL for download."""
        params = {
            "Bucket": self.bucket_name,
            "Key": storage_key,
        }

        if filename:
            params["ResponseContentDisposition"] = f'attachment; filename="{filename}"'

        try:
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params=params,
                ExpiresIn=expiration,
            )
            return url
        except ClientError as e:
            raise Exception(f"Failed to generate presigned URL: {str(e)}")

    async def delete_file(self, storage_key: str) -> bool:
        """Delete a file from storage."""
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=storage_key,
            )
            return True
        except ClientError:
            return False

    async def get_file_info(self, storage_key: str) -> Optional[dict]:
        """Get file metadata from S3."""
        try:
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=storage_key,
            )
            return {
                "size": response.get("ContentLength"),
                "content_type": response.get("ContentType"),
                "last_modified": response.get("LastModified"),
            }
        except ClientError:
            return None

    async def upload_file(
        self,
        file_data: bytes,
        user_id: uuid.UUID,
        filename: str,
        content_type: str,
        path: str = "",
    ) -> str:
        """Upload a file directly to S3."""
        storage_key = self._get_storage_key(user_id, filename, path)

        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=storage_key,
                Body=file_data,
                ContentType=content_type,
            )
            return storage_key
        except ClientError as e:
            raise Exception(f"Failed to upload file: {str(e)}")

    async def download_file(self, storage_key: str) -> bytes:
        """Download a file from S3."""
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=storage_key,
            )
            return response["Body"].read()
        except ClientError as e:
            raise Exception(f"Failed to download file: {str(e)}")
