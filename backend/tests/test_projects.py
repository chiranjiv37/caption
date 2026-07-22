"""Tests for project endpoints."""
from io import BytesIO
from unittest.mock import patch

import pytest
from httpx import AsyncClient


async def get_auth_token(client: AsyncClient) -> str:
    """Helper to get auth token."""
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "project_test@example.com",
            "password": "testpassword123",
            "full_name": "Project Test User",
        },
    )
    return response.json()["access_token"]


def _create_project_form(
    name: str,
    description: str | None = None,
    source_language: str = "en",
    filename: str = "test.mp4",
    file_content: bytes = b"fake video content",
) -> tuple[dict, dict]:
    """Build multipart form data and files for project creation."""
    data = {
        "name": name,
        "source_language": source_language,
    }
    if description is not None:
        data["description"] = description

    files = {
        "file": (filename, BytesIO(file_content), "video/mp4"),
    }
    return data, files


async def create_project(
    client: AsyncClient,
    token: str,
    name: str,
    description: str | None = None,
    source_language: str = "en",
):
    """Helper to create a project via multipart upload."""
    data, files = _create_project_form(
        name=name,
        description=description,
        source_language=source_language,
    )
    return await client.post(
        "/api/v1/projects/",
        headers={"Authorization": f"Bearer {token}"},
        data=data,
        files=files,
    )


@pytest.mark.asyncio
async def test_create_project(client: AsyncClient):
    """Test creating a project with a media file."""
    token = await get_auth_token(client)

    response = await create_project(
        client,
        token,
        name="Test Project",
        description="A test project",
        source_language="en",
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Project"
    assert data["description"] == "A test project"
    assert data["initial"] == "T"
    assert data["source_language"] == "en"
    assert data["storage_key"] is not None
    assert data["storage_key"].startswith(f"{data['id']}/")
    assert data["storage_key"].endswith(".mp4")


@pytest.mark.asyncio
async def test_list_projects(client: AsyncClient):
    """Test listing projects."""
    token = await get_auth_token(client)

    # Create a project first
    await create_project(client, token, name="List Test Project")

    # List projects
    response = await client.get(
        "/api/v1/projects/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert len(data["items"]) > 0


@pytest.mark.asyncio
async def test_get_project(client: AsyncClient):
    """Test getting a specific project."""
    token = await get_auth_token(client)

    # Create a project
    create_response = await create_project(client, token, name="Get Test Project")
    project_id = create_response.json()["id"]

    # Get the project
    response = await client.get(
        f"/api/v1/projects/{project_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Get Test Project"


@pytest.mark.asyncio
async def test_update_project(client: AsyncClient):
    """Test updating a project."""
    token = await get_auth_token(client)

    # Create a project
    create_response = await create_project(client, token, name="Update Test Project")
    project_id = create_response.json()["id"]

    # Update the project
    response = await client.put(
        f"/api/v1/projects/{project_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Updated Project Name"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Project Name"
    assert data["initial"] == "U"


@pytest.mark.asyncio
async def test_delete_project(client: AsyncClient):
    """Test deleting a project."""
    token = await get_auth_token(client)

    # Create a project
    create_response = await create_project(client, token, name="Delete Test Project")
    project_id = create_response.json()["id"]

    # Delete the project
    response = await client.delete(
        f"/api/v1/projects/{project_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert "deleted" in response.json()["message"].lower()

    # Try to get the deleted project
    get_response = await client.get(
        f"/api/v1/projects/{project_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_toggle_favorite(client: AsyncClient):
    """Test toggling favorite status."""
    token = await get_auth_token(client)

    # Create a project
    create_response = await create_project(client, token, name="Favorite Test Project")
    project_id = create_response.json()["id"]

    # Toggle favorite
    response = await client.post(
        f"/api/v1/projects/{project_id}/favorite",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["is_favorite"] is True

    # Toggle again
    response = await client.post(
        f"/api/v1/projects/{project_id}/favorite",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.json()["is_favorite"] is False


@pytest.mark.asyncio
async def test_transcribe_project(client: AsyncClient):
    """Test starting transcription for a project with uploaded media."""
    token = await get_auth_token(client)

    create_response = await create_project(client, token, name="Transcribe Test Project")
    assert create_response.status_code == 201
    project = create_response.json()
    project_id = project["id"]
    assert project["storage_key"] is not None

    with patch("app.services.job_service.transcribe_video.delay") as mock_delay:
        response = await client.post(
            f"/api/v1/projects/{project_id}/transcribe",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["project_id"] == project_id
    assert data["storage_key"] == project["storage_key"]
    assert data["job_id"]
    assert data["job_status"] == "uploading"
    mock_delay.assert_called_once()
