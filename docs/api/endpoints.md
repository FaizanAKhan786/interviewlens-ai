# InterviewLens AI — REST API Reference

Interactive OpenAPI documentation is available live at `http://localhost:8000/docs` (Swagger UI) and `http://localhost:8000/redoc`.

All protected endpoints require an `Authorization: Bearer <TOKEN>` header.

---

## Authentication & User Profile
- `POST /api/v1/auth/register`: Create a new candidate account.
- `POST /api/v1/auth/login`: Authenticate and receive a JWT access token.
- `POST /api/v1/auth/demo-login`: Instant demo authentication with a pre-configured senior AI profile.
- `GET /api/v1/auth/me`: Retrieve current authenticated user and profile.
- `PATCH /api/v1/auth/me`: Update profile (target role, experience level, target company, bio).

## Interviews & Uploads
- `POST /api/v1/interviews`: Create an interview metadata record (requires `consent_given: true`).
- `GET /api/v1/interviews`: List interviews owned by the current user.
- `GET /api/v1/interviews/{id}`: Retrieve a specific interview.
- `DELETE /api/v1/interviews/{id}`: Permanently delete an interview recording, transcript, and report.
- `POST /api/v1/interviews/{id}/upload-direct`: Direct multipart upload for media files (`.mp4`, `.webm`, `.mov`, `.mp3`, `.wav`, `.m4a`).
- `POST /api/v1/interviews/{id}/analyze`: Dispatches the background analysis pipeline.
- `GET /api/v1/interviews/{id}/analysis-status`: Polling endpoint returning stage name and progress percentage (0-100%).
- `GET /api/v1/interviews/{id}/report`: Full comprehensive report with questions, candidate answers, rubric scores, communication metrics, and visual observations.
- `POST /api/v1/interviews/seed-demo`: Seeds a full, high-fidelity sample interview for instant exploration.

## Transcripts & Speaker Attribution
- `GET /api/v1/interviews/{id}/transcript`: Returns full transcript with timestamped segments.
- `PATCH /api/v1/interviews/{id}/transcript`: Update full text or candidate speaker tag.
- `POST /api/v1/interviews/{id}/speakers/assign`: Explicitly designate candidate vs interviewer speaker tags and trigger re-analysis.

## Personalized Learning Roadmap
- `GET /api/v1/learning-plans`: List personalized study roadmaps.
- `GET /api/v1/learning-plans/{id}`: Retrieve a specific plan with all daily tasks.
- `PATCH /api/v1/learning-tasks/{id}`: Toggle completion status of a study task.
- `GET /api/v1/knowledge-gaps`: List identified knowledge gaps filtered by priority (`HIGH`, `MEDIUM`, `LOW`).

## Practice Studio
- `GET /api/v1/practice-questions`: List available practice questions.
- `POST /api/v1/practice-attempts`: Submit a practice recording/transcript. Evaluates against prior identified gaps and calculates improvement score.
- `GET /api/v1/practice-attempts/{id}`: View attempt evaluation and gap closure report.

## Exports
- `GET /api/v1/interviews/{id}/export`: Download full assessment data as JSON.
- `GET /api/v1/interviews/{id}/export/pdf`: Download professional multi-page executive PDF report.
