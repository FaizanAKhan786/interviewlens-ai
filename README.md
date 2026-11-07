<div align="center">
  <a href="https://github.com/FaizanAKhan786/interviewlens-ai"><img src="docs/project-showcase.svg" alt="interviewlens-ai conceptual AI system architecture artwork" width="100%" /></a>
  <br />


# InterviewLens AI
### Turn recorded interviews into focused practice

**Recorded interview analysis · Structured feedback · Speech metrics · Study plans**

[![CI Test Suite](https://github.com/FaizanAKhan786/interviewlens-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/FaizanAKhan786/interviewlens-ai/actions)
![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)
![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)
[![Version](https://img.shields.io/badge/Version-v1.1.0-indigo.svg)](https://github.com/FaizanAKhan786/interviewlens-ai/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)

[Quick start](#quick-start) · [Architecture](#architecture) · [Coaching workflow](#coaching-workflow) · [Technical architecture](docs/architecture/overview.md)

</div>

## Overview

InterviewLens AI is an **interview intelligence and personalized coaching SaaS platform** for reviewing previously recorded technical interviews or recording live directly in the browser. It organizes recordings, transcripts, rubric-based feedback, speaking-pattern observations, knowledge gaps, resume skill alignment, and a personalized study plan into one cohesive interface.

The included **local AI provider** is a deterministic demonstration path; optional provider adapters exist for external services (Google Gemini, OpenAI).

| Area | What the app provides |
| --- | --- |
| Ingestion & Live Studio | Recorded video/audio upload, in-browser webcam/mic recording, and consent check |
| Review | Time-linked transcript and question/answer split-view workspace |
| Coaching | Technical rubric, omissions, suggested answer frameworks and follow-up questions |
| Communication | Speaking pace (WPM), pause profiles, and filler-word feedback |
| Resume Alignment | Cross-reference resume skills against interview answers to highlight showcased vs. neglected credentials |
| Learning loop | Seven-day study roadmap and practice attempts with before-and-after scoring |
| Export | Multi-page executive PDF and JSON reporting |
| API | Documented FastAPI routes for auth, interviews, transcripts, learning, practice, and resume alignment |

## Architecture

```mermaid
flowchart TD
    U["Candidate upload / live webcam recording"] --> A["FastAPI API"]
    A --> V["File validation + storage"]
    A --> DB["SQLite / configured database"]
    V --> P["Interview processing pipeline"]
    P --> T["Transcript + question segments"]
    T --> R["Rubric + speech analysis"]
    R --> G["Knowledge gaps"]
    G --> L["Seven-day learning plan"]
    L --> W["Practice Studio"]
    R --> E["PDF / JSON report"]
    W --> DB
    E --> U
```

The code includes provider abstractions and a pipeline intended for integration with actual transcription/analysis services. Capability and quality vary by configured provider.

## Quick start

**Requirements:** Python 3.11+ and pip. Local development defaults to SQLite.

```bash
git clone https://github.com/FaizanAKhan786/interviewlens-ai.git
cd interviewlens-ai
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn services.api.main:app --host 127.0.0.1 --port 8000 --reload
```

Open [the local app](http://127.0.0.1:8000), or check [API docs](http://127.0.0.1:8000/docs) and [health](http://127.0.0.1:8000/health). Choose **Instant Demo** in the UI to explore the seeded feedback workflow without supplying a real recording.

Optional settings are documented in [`.env.example`](.env.example). This code reads environment variables from the running process; do not assume that creating a `.env` file alone configures the app. Set `SECRET_KEY` securely before deploying beyond local development.

## Coaching workflow

```text
Interview question → specific knowledge gap → why it matters
        → study task → targeted practice → revised feedback
```

Rubric categories include relevance, factual accuracy, completeness, clarity, structure and depth. Reported posture/gaze observations, where available, are descriptive interface cues **not hiring competence indicators**.

## Tests and project structure

```bash
python -m pytest tests/test_backend.py -c pytest.ini --rootdir . -v
```

- [`services/api/`](services/api/): FastAPI application and provider interfaces
- [`services/worker/`](services/worker/): background processing code
- [`docs/architecture/overview.md`](docs/architecture/overview.md): detailed architecture
- [`docs/privacy/`](docs/privacy/): privacy and retention guidance
- [`tests/`](tests/): automated checks

**Scope:** This is not an applicant-screening or hiring recommendation engine. Obtain the consent of everyone recorded, avoid uploading sensitive personal information into an unreviewed environment, and validate any model feedback independently.

## Verification & benchmark protocol

[Read the reproducible test and evaluation guide](docs/QUALITY.md). It documents the current automated checks, commands for model-dependent evaluations, and what results **do not** establish.

[Issues](https://github.com/FaizanAKhan786/interviewlens-ai/issues) · [GitHub profile](https://github.com/FaizanAKhan786)
