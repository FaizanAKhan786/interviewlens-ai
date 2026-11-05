# InterviewLens AI — Architecture Overview

> **"Every interview makes you better."**

InterviewLens AI is an end-to-end interview intelligence platform that transforms candidate recording sessions into actionable, rubric-grounded coaching roadmaps and targeted practice routines.

---

## 1. System Architecture

```mermaid
flowchart TD
    User([Job Candidate]) -->|Upload Recording MP4/WebM/WAV| API[FastAPI Application]
    User -->|Instant Seed| Demo[Demo Engine]
    
    API -->|Persist File| Storage[(Secure Private Storage / MinIO)]
    API -->|Record Metadata| DB[(PostgreSQL / SQLite)]
    API -->|Enqueue Task| Worker[Async Background Pipeline]
    
    subgraph Background Processing Pipeline
        Worker --> S1[Stage 1: Validation & Integrity Check]
        S1 --> S2[Stage 2: Audio Extraction & Normalization]
        S2 --> S3[Stage 3: Speech-to-Text Transcription]
        S3 --> S4[Stage 4: Diarization & Role Assignment]
        S4 --> S5[Stage 5: Question-Answer Boundary Detection]
        S5 --> S6[Stage 6: Multi-Dimensional Rubric Evaluation]
        S6 --> S7[Stage 7: Speech Pace & Filler Calculation]
        S7 --> S8[Stage 8: Knowledge Gap Identification]
        S8 --> S9[Stage 9: 7-Day Personalized Study Roadmap]
        S9 --> S10[Stage 10: Executive Report Synthesis]
    end
    
    Background Processing Pipeline --> DB
    DB --> Client[Interactive SPA Client Workspace]
    Client --> PDF[PyMuPDF Executive Export Engine]
```

---

## 2. Core Differentiator: Interview-to-Learning Intelligence

Unlike generic grading tools that provide an arbitrary score, InterviewLens AI maintains a traceable data link through every level of evaluation:

1. **Interview Question**: Detected in the recording with exact timestamp boundaries.
2. **Candidate's Answer**: Transcribed verbatim and linked to the question.
3. **Specific Omission / Misconception**: Critiqued against an objective 6-dimension rubric.
4. **Coaching Explanation**: Supportive explanation clarifying why the omitted concept matters in production.
5. **Study Task**: Assigned to a day in the 7-day accelerated study roadmap.
6. **Practice Question**: Available in Practice Studio for recording improved attempts.
7. **Improvement Metric**: Practice answers are evaluated against previous gaps to verify closure.

---

## 3. Technology Stack Summary

- **Backend**: Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0 ORM.
- **Frontend**: Responsive modern SaaS Single Page Application with Tailwind CSS, Lucide icons, synchronized audio/video player, and split-view analytics workspace.
- **Database**: PostgreSQL (production) / SQLite (local zero-dependency development).
- **AI Abstraction**: `BaseAIProvider` supporting `LocalAIProvider` (deterministic, realistic evaluation engine requiring 0 API keys), `GeminiAIProvider`, and `OpenAIAIProvider`.
- **Exporting**: PyMuPDF (`fitz`) generating multi-page executive assessment PDF reports.
- **Security**: PBKDF2-HMAC-SHA256 password hashing (100,000 iterations), HMAC-SHA256 JWT sessions, strict user-level authorization checks on all endpoints.
