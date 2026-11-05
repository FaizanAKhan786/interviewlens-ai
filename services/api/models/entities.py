import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey, Index, JSON
)
from sqlalchemy.orm import relationship
from services.api.core.database import Base

def gen_uuid() -> str:
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="candidate")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    interviews = relationship("Interview", back_populates="user", cascade="all, delete-orphan")
    learning_plans = relationship("LearningPlan", back_populates="user", cascade="all, delete-orphan")
    practice_attempts = relationship("PracticeAttempt", back_populates="user", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="user", cascade="all, delete-orphan")

class UserProfile(Base):
    __tablename__ = "user_profiles"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    target_role = Column(String(100), default="AI/ML Engineer")
    target_company = Column(String(100), nullable=True)
    experience_level = Column(String(50), default="mid")
    bio = Column(Text, nullable=True)
    resume_text = Column(Text, nullable=True)
    preferred_language = Column(String(20), default="en")
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    user = relationship("User", back_populates="profile")

class Interview(Base):
    __tablename__ = "interviews"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    target_role = Column(String(100), default="AI/ML Engineer")
    experience_level = Column(String(50), default="mid")
    company_name = Column(String(100), nullable=True)
    job_description = Column(Text, nullable=True)
    interview_date = Column(String(50), nullable=True)
    language = Column(String(20), default="en")
    consent_given = Column(Boolean, default=True, nullable=False)
    status = Column(String(50), default="created", index=True)  # created, uploading, processing, completed, failed
    duration_seconds = Column(Float, default=0.0)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    user = relationship("User", back_populates="interviews")
    file = relationship("InterviewFile", back_populates="interview", uselist=False, cascade="all, delete-orphan")
    job = relationship("AnalysisJob", back_populates="interview", uselist=False, cascade="all, delete-orphan")
    transcript = relationship("Transcript", back_populates="interview", uselist=False, cascade="all, delete-orphan")
    speakers = relationship("Speaker", back_populates="interview", cascade="all, delete-orphan")
    questions = relationship("InterviewQuestion", back_populates="interview", cascade="all, delete-orphan")
    communication_metrics = relationship("CommunicationMetrics", back_populates="interview", uselist=False, cascade="all, delete-orphan")
    visual_observations = relationship("VisualObservations", back_populates="interview", uselist=False, cascade="all, delete-orphan")
    knowledge_gaps = relationship("KnowledgeGap", back_populates="interview", cascade="all, delete-orphan")
    learning_plan = relationship("LearningPlan", back_populates="interview", uselist=False, cascade="all, delete-orphan")

class InterviewFile(Base):
    __tablename__ = "interview_files"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    interview_id = Column(String(36), ForeignKey("interviews.id", ondelete="CASCADE"), unique=True, nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    storage_path = Column(String(500), nullable=False)
    mime_type = Column(String(100), default="video/mp4")
    is_video = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    
    interview = relationship("Interview", back_populates="file")

class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    interview_id = Column(String(36), ForeignKey("interviews.id", ondelete="CASCADE"), unique=True, nullable=False)
    status = Column(String(50), default="QUEUED", index=True)
    current_stage = Column(String(100), default="Queued")
    stage_index = Column(Integer, default=0)
    progress_percent = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    interview = relationship("Interview", back_populates="job")

class Transcript(Base):
    __tablename__ = "transcripts"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    interview_id = Column(String(36), ForeignKey("interviews.id", ondelete="CASCADE"), unique=True, nullable=False)
    language = Column(String(20), default="en")
    full_text = Column(Text, nullable=False)
    duration_seconds = Column(Float, default=0.0)
    candidate_speaker_tag = Column(String(50), default="Speaker 2")
    created_at = Column(DateTime, default=utc_now)
    
    interview = relationship("Interview", back_populates="transcript")
    segments = relationship("TranscriptSegment", back_populates="transcript", cascade="all, delete-orphan")

class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    transcript_id = Column(String(36), ForeignKey("transcripts.id", ondelete="CASCADE"), nullable=False, index=True)
    speaker_tag = Column(String(50), default="Speaker 1")
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    text = Column(Text, nullable=False)
    confidence = Column(Float, default=0.95)
    
    transcript = relationship("Transcript", back_populates="segments")

class Speaker(Base):
    __tablename__ = "speakers"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    interview_id = Column(String(36), ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False, index=True)
    speaker_tag = Column(String(50), nullable=False)  # Speaker 1, Speaker 2
    assigned_role = Column(String(50), default="UNASSIGNED")  # INTERVIEWER, CANDIDATE, UNASSIGNED
    display_name = Column(String(100), default="Interviewer")
    user_confirmed = Column(Boolean, default=False)
    
    interview = relationship("Interview", back_populates="speakers")

class InterviewQuestion(Base):
    __tablename__ = "interview_questions"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    interview_id = Column(String(36), ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False, index=True)
    question_index = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=False)
    category = Column(String(100), default="technical_fundamentals")
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    speaker_tag = Column(String(50), default="Speaker 1")
    detection_confidence = Column(Float, default=0.92)
    
    interview = relationship("Interview", back_populates="questions")
    candidate_answer = relationship("CandidateAnswer", back_populates="question", uselist=False, cascade="all, delete-orphan")
    evaluation = relationship("AnswerEvaluation", back_populates="question", uselist=False, cascade="all, delete-orphan")
    knowledge_gaps = relationship("KnowledgeGap", back_populates="question", cascade="all, delete-orphan")

class CandidateAnswer(Base):
    __tablename__ = "candidate_answers"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    question_id = Column(String(36), ForeignKey("interview_questions.id", ondelete="CASCADE"), unique=True, nullable=False)
    answer_text = Column(Text, nullable=False)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    speaker_tag = Column(String(50), default="Speaker 2")
    word_count = Column(Integer, default=0)
    duration_seconds = Column(Float, default=0.0)
    
    question = relationship("InterviewQuestion", back_populates="candidate_answer")
    evaluation = relationship("AnswerEvaluation", back_populates="candidate_answer", uselist=False)

class AnswerEvaluation(Base):
    __tablename__ = "answer_evaluations"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    question_id = Column(String(36), ForeignKey("interview_questions.id", ondelete="CASCADE"), unique=True, nullable=False)
    candidate_answer_id = Column(String(36), ForeignKey("candidate_answers.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    overall_score = Column(Integer, default=70)  # 0-100 coaching rubric score
    rubric_scores = Column(JSON, default=dict)
    strengths = Column(JSON, default=list)
    missing_concepts = Column(JSON, default=list)
    incorrect_statements = Column(JSON, default=list)
    gap_explanation = Column(Text, nullable=True)
    suggested_answer = Column(Text, nullable=False)
    recommended_structure = Column(Text, nullable=True)
    follow_up_questions = Column(JSON, default=list)
    recommended_topics = Column(JSON, default=list)
    transcript_evidence = Column(JSON, default=list)
    evaluation_uncertainty = Column(String(100), default="Low")
    
    question = relationship("InterviewQuestion", back_populates="evaluation")
    candidate_answer = relationship("CandidateAnswer", back_populates="evaluation")

class CommunicationMetrics(Base):
    __tablename__ = "communication_metrics"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    interview_id = Column(String(36), ForeignKey("interviews.id", ondelete="CASCADE"), unique=True, nullable=False)
    speaking_rate_wpm = Column(Float, default=140.0)
    pause_count = Column(Integer, default=4)
    avg_pause_seconds = Column(Float, default=1.8)
    filler_words_count = Column(Integer, default=8)
    filler_words_breakdown = Column(JSON, default=dict)
    repeated_words_count = Column(Integer, default=3)
    longest_answer_seconds = Column(Float, default=85.0)
    shortest_answer_seconds = Column(Float, default=20.0)
    total_speaking_seconds = Column(Float, default=320.0)
    natural_language_coaching = Column(Text, nullable=False)
    
    interview = relationship("Interview", back_populates="communication_metrics")

class VisualObservations(Base):
    __tablename__ = "visual_observations"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    interview_id = Column(String(36), ForeignKey("interviews.id", ondelete="CASCADE"), unique=True, nullable=False)
    is_opted_in = Column(Boolean, default=True)
    head_orientation_summary = Column(String(255), default="Good forward alignment with occasional downward tilt during deep thinking.")
    shoulder_alignment_summary = Column(String(255), default="Relaxed and symmetrical.")
    camera_framing_summary = Column(String(255), default="Upper torso and face centered in upper-third.")
    camera_directed_gaze_summary = Column(String(255), default="Frequent direct lens engagement (72% of speaking duration).")
    movement_patterns_summary = Column(String(255), default="Moderate expressive hand gesturing, no excessive swaying.")
    descriptive_observations = Column(JSON, default=list)
    limitations_notice = Column(Text, default="Visual cues are strictly observational coaching notes. Gaze direction does not equal true eye contact or attention. Appearance has zero influence on technical or hiring suitability.")
    
    interview = relationship("Interview", back_populates="visual_observations")

class KnowledgeGap(Base):
    __tablename__ = "knowledge_gaps"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    interview_id = Column(String(36), ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    related_question_id = Column(String(36), ForeignKey("interview_questions.id", ondelete="SET NULL"), nullable=True)
    topic_name = Column(String(150), nullable=False)
    category = Column(String(100), default="Technical")
    explanation = Column(Text, nullable=False)
    why_it_matters = Column(Text, nullable=False)
    priority = Column(String(20), default="HIGH")  # HIGH, MEDIUM, LOW
    study_activities = Column(JSON, default=list)
    practice_questions = Column(JSON, default=list)
    learning_resources = Column(JSON, default=list)
    status = Column(String(50), default="IDENTIFIED")  # IDENTIFIED, IN_PROGRESS, MASTERED
    created_at = Column(DateTime, default=utc_now)
    
    interview = relationship("Interview", back_populates="knowledge_gaps")
    question = relationship("InterviewQuestion", back_populates="knowledge_gaps")

class LearningPlan(Base):
    __tablename__ = "learning_plans"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    interview_id = Column(String(36), ForeignKey("interviews.id", ondelete="CASCADE"), unique=True, nullable=False)
    title = Column(String(255), nullable=False)
    target_role = Column(String(100), default="AI/ML Engineer")
    estimated_hours = Column(Float, default=12.0)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    user = relationship("User", back_populates="learning_plans")
    interview = relationship("Interview", back_populates="learning_plan")
    tasks = relationship("LearningTask", back_populates="plan", cascade="all, delete-orphan", order_by="LearningTask.day_number")

class LearningTask(Base):
    __tablename__ = "learning_tasks"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    plan_id = Column(String(36), ForeignKey("learning_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    day_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), default="Study")
    topic_name = Column(String(150), nullable=False)
    estimated_minutes = Column(Integer, default=45)
    related_question_id = Column(String(36), nullable=True)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    
    plan = relationship("LearningPlan", back_populates="tasks")

class PracticeQuestion(Base):
    __tablename__ = "practice_questions"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    interview_id = Column(String(36), ForeignKey("interviews.id", ondelete="SET NULL"), nullable=True)
    source_type = Column(String(50), default="INTERVIEW_DERIVED")  # INTERVIEW_DERIVED, AI_GENERATED, ROLE_DEFAULT
    question_text = Column(Text, nullable=False)
    category = Column(String(100), default="Technical")
    difficulty = Column(String(50), default="INTERMEDIATE")  # BEGINNER, INTERMEDIATE, ADVANCED
    priority = Column(String(50), default="HIGH")  # HIGH, MEDIUM, ADVANCED
    preparation_tips = Column(Text, nullable=True)
    expected_key_concepts = Column(JSON, default=list)
    created_at = Column(DateTime, default=utc_now)
    
    attempts = relationship("PracticeAttempt", back_populates="question", cascade="all, delete-orphan")

class PracticeAttempt(Base):
    __tablename__ = "practice_attempts"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    question_id = Column(String(36), ForeignKey("practice_questions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    attempt_number = Column(Integer, default=1)
    transcript = Column(Text, nullable=False)
    duration_seconds = Column(Float, default=45.0)
    score = Column(Integer, default=80)
    strengths = Column(JSON, default=list)
    addressed_gaps = Column(JSON, default=list)
    remaining_gaps = Column(JSON, default=list)
    feedback_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now)
    
    question = relationship("PracticeQuestion", back_populates="attempts")
    user = relationship("User", back_populates="practice_attempts")

class AuditEvent(Base):
    __tablename__ = "audit_events"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    details = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utc_now)
    
    user = relationship("User", back_populates="audit_events")
