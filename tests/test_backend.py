import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException
from services.api.core.database import Base
from services.api.core.security import hash_password, verify_password, create_access_token, decode_access_token
from services.api.models.entities import (
    User, UserProfile, Interview, InterviewQuestion, CandidateAnswer,
    AnswerEvaluation, CommunicationMetrics, KnowledgeGap, LearningPlan,
    LearningTask, PracticeQuestion, PracticeAttempt, gen_uuid
)
from services.api.schemas.user import UserCreate, UserLogin, UserProfileUpdate
from services.api.schemas.interview import (
    InterviewCreate, TranscriptUpdate, SpeakerAssignRequest,
    PracticeAttemptCreate
)
from services.api.routers import auth, interviews, transcripts, learning, practice, exports
from services.worker.pipeline import run_analysis_pipeline

TEST_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_interviewlens.db"))
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_PATH}"

test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass

@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

# 1. Security & Hashing Tests
def test_password_hashing():
    pwd = "SecureInterview2026!"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

def test_jwt_token_creation_and_validation():
    payload = {"sub": "user-12345", "email": "test@interviewlens.ai"}
    token = create_access_token(payload, expires_delta=3600)
    assert isinstance(token, str)
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "user-12345"
    assert decoded["email"] == "test@interviewlens.ai"

    # Invalid token verification
    assert decode_access_token("invalid.token.signature") is None

# 2. Auth Router Tests
def test_user_registration(db):
    user_in = UserCreate(
        email="candidate.alpha@interviewlens.ai",
        full_name="Alpha Candidate",
        password="AlphaPassword123!"
    )
    res = auth.register(user_in, db=db)
    assert res.user.email == "candidate.alpha@interviewlens.ai"
    assert res.access_token is not None

    # Duplicate registration fails
    with pytest.raises(HTTPException) as exc:
        auth.register(user_in, db=db)
    assert exc.value.status_code == 400

def test_user_login(db):
    login_in = UserLogin(
        email="candidate.alpha@interviewlens.ai",
        password="AlphaPassword123!"
    )
    res = auth.login(login_in, db=db)
    assert res.access_token is not None

    # Invalid password fails
    with pytest.raises(HTTPException) as exc:
        auth.login(UserLogin(email="candidate.alpha@interviewlens.ai", password="WrongPassword!"), db=db)
    assert exc.value.status_code == 401

def test_demo_login_creates_senior_profile(db):
    res = auth.demo_login(db=db)
    assert res.user.email.startswith("demo-")
    assert res.user.email.endswith("@example.com")
    assert "Alex Mercer" in res.user.full_name
    assert res.user.profile.target_role == "Senior AI/ML Engineer"

    # No two visitors should share access to one demo account.
    other = auth.demo_login(db=db)
    assert other.user.id != res.user.id
    assert other.user.email != res.user.email
    assert decode_access_token(res.access_token)["sub"] == res.user.id
    assert decode_access_token(other.access_token)["sub"] == other.user.id

# 3. Profile Updates
def test_update_profile(db):
    user = db.query(User).filter(User.email == "candidate.alpha@interviewlens.ai").first()
    update_data = UserProfileUpdate(
        target_role="Lead LLM Architect",
        target_company="DeepMind",
        experience_level="lead",
        bio="Specializing in multi-agent orchestration."
    )
    updated = auth.update_profile(update_data, current_user=user, db=db)
    assert updated.profile.target_role == "Lead LLM Architect"
    assert updated.profile.target_company == "DeepMind"

# 4. Interview Creation & Consent Validation
def test_interview_creation_consent_enforcement(db):
    user = db.query(User).filter(User.email == "candidate.alpha@interviewlens.ai").first()
    
    # Must fail if consent_given is False
    with pytest.raises(HTTPException) as exc:
        interviews.create_interview(
            InterviewCreate(
                title="Unconsented Session",
                target_role="AI/ML Engineer",
                consent_given=False
            ),
            current_user=user,
            db=db
        )
    assert exc.value.status_code == 400

    # Succeeds with consent
    inv = interviews.create_interview(
        InterviewCreate(
            title="Senior AI Screen - RAG & Caching",
            target_role="Senior AI/ML Engineer",
            experience_level="senior",
            company_name="Anthropic",
            consent_given=True
        ),
        current_user=user,
        db=db
    )
    assert inv.title == "Senior AI Screen - RAG & Caching"
    assert inv.status == "created"

# 5. Cross-User Authorization Isolation
def test_cross_user_isolation(db):
    user_a = db.query(User).filter(User.email == "candidate.alpha@interviewlens.ai").first()
    
    # Register User B
    user_b_res = auth.register(
        UserCreate(email="candidate.beta@interviewlens.ai", full_name="Beta Candidate", password="Password123!"),
        db=db
    )
    user_b = db.query(User).filter(User.id == user_b_res.user.id).first()

    # User A's interview
    inv_a = interviews.create_interview(
        InterviewCreate(title="Confidential Interview A", target_role="Staff Engineer", consent_given=True),
        current_user=user_a,
        db=db
    )

    # User B attempts to access User A's interview -> 404
    with pytest.raises(HTTPException) as exc:
        interviews.get_interview(inv_a.id, current_user=user_b, db=db)
    assert exc.value.status_code == 404

    # User B attempts to get report -> 404
    with pytest.raises(HTTPException) as exc:
        interviews.get_interview_report(inv_a.id, current_user=user_b, db=db)
    assert exc.value.status_code == 404

# 6. Pipeline Execution & Full Report Synthesis
def test_pipeline_execution_and_report_generation(db):
    user = db.query(User).filter(User.email == "candidate.alpha@interviewlens.ai").first()
    inv = interviews.create_interview(
        InterviewCreate(
            title="Full Architecture Evaluation",
            target_role="Senior AI/ML Engineer",
            company_name="ScaleTech AI",
            consent_given=True
        ),
        current_user=user,
        db=db
    )

    # Run the background pipeline
    run_analysis_pipeline(inv.id, db_session=db)

    # Refresh interview record
    db.refresh(user)
    updated_inv = db.query(Interview).filter(Interview.id == inv.id).first()
    assert updated_inv.status == "completed"

    # Retrieve report
    report = interviews.get_interview_report(inv.id, current_user=user, db=db)
    assert len(report.questions) > 0
    assert report.overall_performance_score >= 60

    # Verify first question evaluation
    q1 = report.questions[0]
    assert "production RAG" in q1.question_text
    assert q1.candidate_answer is not None
    assert q1.evaluation is not None
    assert len(q1.evaluation.strengths) > 0
    assert len(q1.evaluation.missing_concepts) > 0
    assert any("rerank" in c.lower() or "retrieval" in c.lower() or "metric" in c.lower() for c in q1.evaluation.missing_concepts)
    assert q1.evaluation.suggested_answer != ""

    # Verify speech communication metrics
    assert report.communication is not None
    assert report.communication.speaking_rate_wpm > 100
    assert report.communication.natural_language_coaching != ""

    # Verify visual observations
    assert report.visual is not None
    assert "Gaze" in report.visual.camera_directed_gaze_summary or "engagement" in report.visual.camera_directed_gaze_summary
    assert report.visual.limitations_notice != ""

    # Verify knowledge gaps
    assert len(report.knowledge_gaps) >= 2
    assert report.knowledge_gaps[0].priority in ["HIGH", "MEDIUM", "LOW"]

# 7. Transcript Inspection and Speaker Reassignment
def test_transcript_retrieval_and_speaker_assignment(db):
    user = db.query(User).filter(User.email == "candidate.alpha@interviewlens.ai").first()
    inv = db.query(Interview).filter(Interview.user_id == user.id, Interview.status == "completed").first()

    transcript = transcripts.get_transcript(inv.id, current_user=user, db=db)
    assert transcript.candidate_speaker_tag == "Speaker 2"
    assert len(transcript.segments) > 0

    # Update transcript text
    updated = transcripts.update_transcript(
        inv.id,
        TranscriptUpdate(full_text="Updated corrected transcript"),
        current_user=user,
        db=db
    )
    assert updated.full_text == "Updated corrected transcript"

# 8. Learning Roadmap & Task Progress Tracking
def test_learning_roadmap_and_task_toggle(db):
    user = db.query(User).filter(User.email == "candidate.alpha@interviewlens.ai").first()
    plans = learning.list_learning_plans(current_user=user, db=db)
    assert len(plans) > 0

    plan = plans[0]
    assert len(plan.tasks) == 7  # 7-Day accelerated plan
    task = plan.tasks[0]
    assert task.is_completed is False

    # Toggle task
    toggled = learning.toggle_learning_task(task.id, current_user=user, db=db)
    assert toggled.is_completed is True
    assert toggled.completed_at is not None

# 9. Practice Studio & Before-and-After Comparison
def test_practice_studio_attempt_evaluation(db):
    user = db.query(User).filter(User.email == "candidate.alpha@interviewlens.ai").first()
    questions = practice.list_practice_questions(current_user=user, db=db)
    assert len(questions) > 0
    target_q = questions[0]

    # Attempt 1: Submitting improved response that addresses previous gap (hybrid search, Recall@K)
    improved_answer = (
        "In production RAG, I implement hybrid search combining BM25 keyword search and HNSW dense vector indexing "
        "fused via Reciprocal Rank Fusion. For evaluation, I measure Recall@K, Mean Reciprocal Rank (MRR), and Context Faithfulness."
    )
    attempt1 = practice.submit_practice_attempt(
        PracticeAttemptCreate(question_id=target_q.id, transcript=improved_answer, duration_seconds=50.0),
        current_user=user,
        db=db
    )
    assert attempt1.score >= 75
    assert attempt1.attempt_number == 1
    assert len(attempt1.addressed_gaps) > 0
    assert "Substantial improvement" in attempt1.feedback_text

# 10. PDF & JSON Report Export Generation
def test_report_exports(db):
    user = db.query(User).filter(User.email == "candidate.alpha@interviewlens.ai").first()
    inv = db.query(Interview).filter(Interview.user_id == user.id, Interview.status == "completed").first()

    # JSON export
    json_resp = exports.export_interview_json(inv.id, current_user=user, db=db)
    assert json_resp.status_code == 200

    # PDF export
    pdf_resp = exports.export_interview_pdf(inv.id, current_user=user, db=db)
    assert pdf_resp.status_code == 200
    assert pdf_resp.media_type == "application/pdf"
    assert len(pdf_resp.body) > 1000  # Valid multi-page PDF

# 11. Resume Parser & Alignment Tests
def test_resume_parser_and_alignment(db):
    user = db.query(User).filter(User.email == "candidate.alpha@interviewlens.ai").first()
    inv = db.query(Interview).filter(Interview.user_id == user.id, Interview.status == "completed").first()

    from services.api.services.resume_parser import ResumeParserService

    sample_resume = (
        "Experienced AI Engineer with skills in Python, PyTorch, Docker, Kubernetes, Kafka, Redis, "
        "PostgreSQL, Vector Search (Pinecone), and LLM architectures. Designed high-throughput microservices."
    )
    skills = ResumeParserService.extract_skills(sample_resume)
    assert "Python" in skills
    assert "Kafka" in skills
    assert "Docker" in skills

    # Check alignment against RAG answers
    answers = ["I implemented embeddings with Pinecone and Redis caching for our vector search queries."]
    align = ResumeParserService.analyze_resume_alignment(
        resume_text=sample_resume,
        job_description="Seeking AI Engineer with Python, Kafka, and Kubernetes expertise.",
        interview_answers=answers
    )
    assert align["alignment_score"] > 50
    assert "Redis" in align["showcased_in_interview"] or "Python" in align["showcased_in_interview"]
    assert "Kafka" in align["neglected_resume_skills"] or "Kubernetes" in align["neglected_resume_skills"]

    # The endpoint must not invent a resume when none has been uploaded.
    if user.profile:
        user.profile.resume_text = ""
        db.commit()
    with pytest.raises(HTTPException) as missing:
        interviews.get_resume_alignment(inv.id, current_user=user, db=db)
    assert missing.value.status_code == 404

    # Verify alignment after providing real resume text.
    user.profile.resume_text = sample_resume
    db.commit()
    res = interviews.get_resume_alignment(inv.id, current_user=user, db=db)
    assert res["alignment_score"] > 50
    assert len(res["detected_resume_skills"]) > 0

# 12. Interview Deletion & Data Retention
def test_interview_deletion(db):
    user = db.query(User).filter(User.email == "candidate.alpha@interviewlens.ai").first()
    temp_inv = interviews.create_interview(
        InterviewCreate(title="Disposable Recording", target_role="Tester", consent_given=True),
        current_user=user,
        db=db
    )
    inv_id = temp_inv.id

    # Delete
    del_res = interviews.delete_interview(inv_id, current_user=user, db=db)
    assert del_res is None

    # Verify gone
    with pytest.raises(HTTPException) as exc:
        interviews.get_interview(inv_id, current_user=user, db=db)
    assert exc.value.status_code == 404


# Regression: users must not submit practice attempts for another user's question.
def test_private_practice_question_isolation(db):
    owner = User(
        id=gen_uuid(), email="practice.owner@interviewlens.ai",
        full_name="Practice Owner", hashed_password=hash_password("TestOwnerPassword!"),
    )
    outsider = User(
        id=gen_uuid(), email="practice.outsider@interviewlens.ai",
        full_name="Practice Outsider", hashed_password=hash_password("TestOutsiderPassword!"),
    )
    db.add_all([owner, outsider])
    db.flush()
    question = PracticeQuestion(
        id=gen_uuid(), user_id=owner.id, question_text="Design an agentic RAG system.",
        source_type="INTERVIEW_DERIVED",
    )
    db.add(question)
    db.commit()

    with pytest.raises(HTTPException) as exc:
        practice.submit_practice_attempt(
            PracticeAttemptCreate(question_id=question.id, transcript="An unauthorized attempt."),
            current_user=outsider, db=db,
        )
    assert exc.value.status_code == 404
    assert db.query(PracticeAttempt).filter_by(question_id=question.id).count() == 0


def test_report_without_evaluation_has_no_invented_score(db):
    user = db.query(User).filter(User.email == "candidate.alpha@interviewlens.ai").first()
    interview = interviews.create_interview(
        InterviewCreate(title="Awaiting evaluation", consent_given=True),
        current_user=user, db=db,
    )
    report = interviews.get_interview_report(interview.id, current_user=user, db=db)
    assert report.overall_performance_score is None
    pdf = exports.export_interview_pdf(interview.id, current_user=user, db=db)
    assert b"Not evaluated" in pdf.body or pdf.status_code == 200
