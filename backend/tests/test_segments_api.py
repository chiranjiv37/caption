"""API tests for transcript, segment, and project speaker endpoints."""
import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.segment import Segment
from app.models.series import Language
from app.models.transcript import Transcript
from app.models.user import User
from app.utils.security import get_password_hash


async def _register(client: AsyncClient, email: str) -> str:
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "testpassword123",
            "full_name": "API Test User",
        },
    )
    assert response.status_code in (200, 201)
    return response.json()["access_token"]


@pytest_asyncio.fixture
async def seeded_project(db_session: AsyncSession) -> dict:
    """Seed user, project, original transcript, and two segments."""
    lang = (
        await db_session.execute(select(Language).where(Language.code == "en"))
    ).scalar_one_or_none()
    if not lang:
        db_session.add(Language(code="en", name="English", native_name="English"))
        await db_session.flush()

    email = f"seg-api-{uuid.uuid4().hex[:8]}@example.com"
    user = User(
        email=email,
        hashed_password=get_password_hash("testpassword123"),
        full_name="Seg API User",
    )
    db_session.add(user)
    await db_session.flush()

    project = Project(
        name="Caption API Project",
        initial="C",
        source_language="en",
        owner_id=user.id,
        storage_key=f"{uuid.uuid4()}/video.mp4",
    )
    db_session.add(project)
    await db_session.flush()

    transcript = Transcript(
        project_id=project.id,
        language_code="en",
        type="original",
        status="completed",
        version=1,
    )
    db_session.add(transcript)
    await db_session.flush()

    s1 = Segment(
        transcript_id=transcript.id,
        start_time=0.0,
        end_time=2.0,
        sort_order=0,
        text="Hello world.",
    )
    s2 = Segment(
        transcript_id=transcript.id,
        start_time=2.0,
        end_time=4.0,
        sort_order=1,
        text="More text.",
    )
    db_session.add_all([s1, s2])
    await db_session.commit()

    return {
        "email": email,
        "password": "testpassword123",
        "project_id": str(project.id),
        "transcript_id": str(transcript.id),
        "segment_ids": [str(s1.id), str(s2.id)],
    }


async def _login(client: AsyncClient, email: str, password: str) -> str:
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_list_transcripts_and_segments(
    client: AsyncClient,
    seeded_project: dict,
):
    token = await _login(
        client, seeded_project["email"], seeded_project["password"]
    )
    headers = {"Authorization": f"Bearer {token}"}
    project_id = seeded_project["project_id"]
    transcript_id = seeded_project["transcript_id"]

    resp = await client.get(
        f"/api/v1/projects/{project_id}/transcripts",
        headers=headers,
    )
    assert resp.status_code == 200
    transcripts = resp.json()
    assert len(transcripts) == 1
    assert transcripts[0]["type"] == "original"
    assert transcripts[0]["language_code"] == "en"

    resp = await client.get(
        f"/api/v1/projects/{project_id}/transcripts/{transcript_id}/segments",
        headers=headers,
    )
    assert resp.status_code == 200
    segments = resp.json()
    assert len(segments) == 2
    assert segments[0]["text"] == "Hello world."

    resp = await client.get(
        f"/api/v1/projects/{project_id}/segments",
        headers=headers,
        params={"language_code": "en"},
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_update_batch_merge_split(
    client: AsyncClient,
    seeded_project: dict,
):
    token = await _login(
        client, seeded_project["email"], seeded_project["password"]
    )
    headers = {"Authorization": f"Bearer {token}"}
    project_id = seeded_project["project_id"]
    transcript_id = seeded_project["transcript_id"]
    seg1, seg2 = seeded_project["segment_ids"]

    resp = await client.patch(
        f"/api/v1/projects/{project_id}/segments/{seg1}",
        headers=headers,
        json={"text": "Hello updated."},
    )
    assert resp.status_code == 200
    assert resp.json()["text"] == "Hello updated."

    resp = await client.put(
        f"/api/v1/projects/{project_id}/transcripts/{transcript_id}/segments/batch",
        headers=headers,
        json={
            "segments": [
                {"id": seg1, "text": "A"},
                {"id": seg2, "text": "B"},
            ]
        },
    )
    assert resp.status_code == 200
    texts = {s["id"]: s["text"] for s in resp.json()}
    assert texts[seg1] == "A"
    assert texts[seg2] == "B"

    resp = await client.post(
        f"/api/v1/projects/{project_id}/transcripts/{transcript_id}/segments/merge",
        headers=headers,
        json={"segment_ids": [seg1, seg2]},
    )
    assert resp.status_code == 200
    merged = resp.json()
    assert merged["text"] == "A B"
    assert merged["start_time"] == 0.0
    assert merged["end_time"] == 4.0
    merged_id = merged["id"]

    resp = await client.post(
        f"/api/v1/projects/{project_id}/segments/{merged_id}/split",
        headers=headers,
        json={"split_at": 2.0},
    )
    assert resp.status_code == 200
    parts = resp.json()
    assert len(parts) == 2
    assert parts[0]["end_time"] == 2.0
    assert parts[1]["start_time"] == 2.0
    assert parts[1]["text"] == ""


@pytest.mark.asyncio
async def test_speakers_crud(client: AsyncClient, seeded_project: dict):
    token = await _login(
        client, seeded_project["email"], seeded_project["password"]
    )
    headers = {"Authorization": f"Bearer {token}"}
    project_id = seeded_project["project_id"]

    resp = await client.post(
        f"/api/v1/projects/{project_id}/speakers",
        headers=headers,
        json={"name": "Host", "hue": 120},
    )
    assert resp.status_code == 201
    speaker = resp.json()
    assert speaker["name"] == "Host"
    assert speaker["segment_count"] == 0
    speaker_id = speaker["id"]

    resp = await client.get(
        f"/api/v1/projects/{project_id}/speakers",
        headers=headers,
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    resp = await client.patch(
        f"/api/v1/projects/{project_id}/speakers/{speaker_id}",
        headers=headers,
        json={"name": "Narrator"},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Narrator"

    resp = await client.delete(
        f"/api/v1/projects/{project_id}/speakers/{speaker_id}",
        headers=headers,
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_wrong_project_transcript_404(
    client: AsyncClient,
    seeded_project: dict,
):
    token = await _login(
        client, seeded_project["email"], seeded_project["password"]
    )
    headers = {"Authorization": f"Bearer {token}"}
    fake_transcript = str(uuid.uuid4())

    resp = await client.get(
        f"/api/v1/projects/{seeded_project['project_id']}/transcripts/{fake_transcript}/segments",
        headers=headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_non_member_cannot_access(
    client: AsyncClient,
    seeded_project: dict,
):
    other_token = await _register(
        client, f"other-{uuid.uuid4().hex[:8]}@example.com"
    )
    headers = {"Authorization": f"Bearer {other_token}"}

    resp = await client.get(
        f"/api/v1/projects/{seeded_project['project_id']}/transcripts",
        headers=headers,
    )
    assert resp.status_code == 404
