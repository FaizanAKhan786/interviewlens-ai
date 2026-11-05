# InterviewLens AI

> **"Every interview makes you better."**

**InterviewLens AI** is a production-oriented AI interview intelligence and personalized career coaching SaaS platform. Job candidates can upload previously recorded interviews (video or audio) and receive deep rubric-grounded feedback, speech pacing metrics, traceable knowledge gap detection, personalized 7-day study roadmaps, and a dedicated Practice Studio to measure before-and-after improvement.

---

## 🌟 Key Features

1. **Multi-Format Recording Ingestion**:
   - Accepts MP4, WebM, MOV, WAV, MP3, and M4A recordings.
   - Enforces user permission and recording consent verification.
   - Real-time 10-stage processing pipeline tracker.

2. **Synchronized Video/Audio & Transcript Workspace**:
   - Split-view interface with synchronized playback timecode.
   - Speaker diarization (Interviewer vs Candidate) with one-click voice tag reassignment and re-analysis.
   - Clickable question timeline to jump immediately to question responses.

3. **Multi-Dimensional Technical Rubric Evaluation**:
   - Evaluates Relevance, Factual Accuracy, Technical Completeness, Clarity, Structure, and Depth.
   - Highlights valuable strong points, omissions, and misleading statements.
   - Provides concrete model answer frameworks and relevant follow-up questions.

4. **Interview-to-Learning Intelligence Trace**:
   - Preserves a continuous, traceable chain:
     *Interview Question* ➔ *Candidate Omission* ➔ *Why It Matters* ➔ *Study Roadmap Task* ➔ *Practice Drill* ➔ *Verified Gap Closure*.

5. **Speech Pacing & Communication Analysis**:
   - Computes Words Per Minute (WPM) compared to optimal benchmarks (130–160 WPM).
   - Tallies and breaks down filler tokens (*"um"*, *"like"*, *"basically"*).
   - Generates supportive, non-punitive natural language communication coaching.

6. **Descriptive Observable Posture Module**:
   - Evaluates head orientation, shoulder posture, camera framing, and lens engagement.
   - Transparent ethical disclaimer: appearance and gaze direction have zero bearing on hiring competence.

7. **Practice Studio (Before-and-After Metrics)**:
   - Candidates re-record or submit improved answers to their specific weak areas.
   - Automated evaluation verifies which previous gaps were addressed and scores improvement.

8. **Executive Report Exports**:
   - Direct export to multi-page executive PDF reports generated via PyMuPDF.
   - Structured JSON export for portfolio or LMS tracking.

9. **Security, Privacy & Retention**:
   - PBKDF2-HMAC-SHA256 salted password hashing (100,000 iterations).
   - HMAC-SHA256 signed JWT session authentication.
   - Strict resource ownership authorization (User B cannot access User A's data).
   - Complete self-serve interview and file purging.

---

## 🚀 Quick Local Startup

### 1. Prerequisites
- Python 3.11+ (Python 3.12 recommended)
- Git

### 2. Environment Setup
```powershell
# Navigate to the project directory
cd C:\Users\halal\.gemini\antigravity\scratch\interviewlens-ai

# Activate the local virtual environment
.\.venv\Scripts\Activate.ps1

# Or install dependencies in your own venv:
pip install -r requirements.txt
```

### 3. Launch Application Server
```powershell
python -m uvicorn services.api.main:app --host 127.0.0.1 --port 8000 --reload
```

Open your browser to:
- **Web Application**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **API Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

*Tip*: Click **"Instant Demo"** in the top navigation bar to explore a pre-populated Senior AI/ML Engineer interview report in one click without registration.

---

## 🧪 Automated Test Suite

Run the complete test suite verifying security, authentication, cross-user isolation, pipeline execution, rubric evaluation, study roadmaps, practice evaluations, and PDF generation:

```powershell
python -m pytest tests/test_backend.py -c pytest.ini --rootdir . -v
```

### Test Results:
```
tests/test_backend.py::test_password_hashing PASSED
tests/test_backend.py::test_jwt_token_creation_and_validation PASSED
tests/test_backend.py::test_user_registration PASSED
tests/test_backend.py::test_user_login PASSED
tests/test_backend.py::test_demo_login_creates_senior_profile PASSED
tests/test_backend.py::test_update_profile PASSED
tests/test_backend.py::test_interview_creation_consent_enforcement PASSED
tests/test_backend.py::test_cross_user_isolation PASSED
tests/test_backend.py::test_pipeline_execution_and_report_generation PASSED
tests/test_backend.py::test_transcript_retrieval_and_speaker_assignment PASSED
tests/test_backend.py::test_learning_roadmap_and_task_toggle PASSED
tests/test_backend.py::test_practice_studio_attempt_evaluation PASSED
tests/test_backend.py::test_report_exports PASSED
tests/test_backend.py::test_interview_deletion PASSED

============================= 14 passed in 6.25s ==============================
```

---

## 📁 Repository Structure

```
interviewlens-ai/
├── apps/
│   └── web/                     # Frontend client workspace
├── services/
│   ├── api/
│   │   ├── ai/                  # AI provider abstractions (Local, Gemini, OpenAI)
│   │   ├── core/                # Config, DB engine, JWT security, auth deps
│   │   ├── models/              # Normalized SQLAlchemy 2.0 ORM entities
│   │   ├── routers/             # Documented REST API endpoints
│   │   ├── schemas/             # Pydantic v2 schemas and validation models
│   │   ├── static/              # Modern SaaS Single Page Application (HTML/JS/Tailwind)
│   │   └── main.py              # FastAPI entrypoint and router registry
│   └── worker/
│       └── pipeline.py          # 10-stage asynchronous background processing pipeline
├── packages/
│   └── shared-schemas/          # Cross-boundary API contracts
├── infrastructure/
│   └── docker/                  # Production Dockerfiles (API and Worker)
├── tests/
│   └── test_backend.py          # Comprehensive automated test suite
├── docs/                        # Architecture, API, deployment, and privacy specs
├── docker-compose.yml           # Multi-service stack (API, Worker, Postgres, Redis, MinIO)
├── .env.example                 # Environment configuration template
└── README.md
```

---

## 🗺️ Roadmap: Phase 2 & 3

- [x] **Phase 1 (MVP)**: Full multi-stage pipeline, authentication, rubric evaluation, communication pacing, video posture module, traceable knowledge gaps, 7-day study roadmap, Practice Studio with before-and-after comparison, PDF export, zero-leakage cross-user authorization.
- [ ] **Phase 2**: Resume PDF parsing and auto-gap alignment with targeted job descriptions, live audio recording in-browser via WebRTC, and multilingual speech transcription (English-Arabic).
- [ ] **Phase 3**: Adaptive live AI mock interviewer agent with conversational interruptibility, cohort analytics for university bootcamps, and Stripe subscription entitlements.
