"""Tests for project endpoints."""
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


@pytest.mark.asyncio
async def test_create_project(client: AsyncClient):
    """Test creating a project."""
    token = await get_auth_token(client)

    response = await client.post(
        "/api/v1/projects/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Test Project",
            "description": "A test project",
            "source_language": "en",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Project"
    assert data["description"] == "A test project"
    assert data["initial"] == "T"
    assert data["source_language"] == "en"


@pytest.mark.asyncio
async def test_list_projects(client: AsyncClient):
    """Test listing projects."""
    token = await get_auth_token(client)

    # Create a project first
    await client.post(
        "/api/v1/projects/",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "List Test Project"},
    )

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
    create_response = await client.post(
        "/api/v1/projects/",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Get Test Project"},
    )
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
    create_response = await client.post(
        "/api/v1/projects/",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Update Test Project"},
    )
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
    create_response = await client.post(
        "/api/v1/projects/",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Delete Test Project"},
    )
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
    create_response = await client.post(
        "/api/v1/projects/",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Favorite Test Project"},
    )
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
