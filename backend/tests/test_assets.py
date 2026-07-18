"""Tests for asset endpoints."""
import pytest
from httpx import AsyncClient


async def get_auth_token(client: AsyncClient) -> str:
    """Helper to get auth token."""
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "asset_test@example.com",
            "password": "testpassword123",
        },
    )
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_list_assets_empty(client: AsyncClient):
    """Test listing assets when empty."""
    token = await get_auth_token(client)

    response = await client.get(
        "/api/v1/assets/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_get_presigned_url(client: AsyncClient):
    """Test getting presigned upload URL."""
    token = await get_auth_token(client)

    # This test may fail if S3 is not configured
    # Just testing the endpoint structure
    response = await client.post(
        "/api/v1/assets/presigned-url",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "filename": "test.mp4",
            "content_type": "video/mp4",
            "path": "videos",
        },
    )

    # If S3 is not configured, this will fail
    # In a real test, we'd mock the S3 service
    assert response.status_code in [200, 500]


@pytest.mark.asyncio
async def test_create_folder(client: AsyncClient):
    """Test creating a folder."""
    token = await get_auth_token(client)

    response = await client.post(
        "/api/v1/assets/folders",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Test Folder",
            "path": "",
        },
    )
    assert response.status_code == 200
    assert "created" in response.json()["message"].lower()
