from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class InterviewCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    target_role: str = Field(default="AI/ML Engineer")
    experience_level: str = Field(default="mid")
    company_name: Optional[str] = None
    job_description: Optional[str] = None
    interview_date: Optional[str] = None
    language: str = Field(default="en")
    consent_given: bool = Field(..., description="User confirmation of recording consent")

class InterviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    title: str
    target_role: str
    experience_level: str
    company_name: Optional[str] = None
    job_description: Optional[str] = None
    interview_date: Optional[str] = None
    language: str
    status: str
    duration_seconds: float
    created_at: datetime
    has_file: bool = False
    file_name: Optional[str] = None
    is_video: Optional[bool] = None

class AnalysisStatusResponse(BaseModel):
    interview_id: str
    status: str
    current_stage: str
    stage_index: int
    progress_percent: int
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class TranscriptSegmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    speaker_tag: str
    start_time: float
    end_time: float
    text: str
    confidence: float

class TranscriptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    interview_id: str
    language: str
    full_text: str
    duration_seconds: float
    candidate_speaker_tag: str
    segments: List[TranscriptSegmentOut] = []

class TranscriptUpdate(BaseModel):
    full_text: Optional[str] = None
    candidate_speaker_tag: Optional[str] = None

class SpeakerAssignRequest(BaseModel):
    candidate_speaker_tag: str  # e.g., "Speaker 2"
    interviewer_speaker_tag: Optional[str] = "Speaker 1"

class RubricBreakdown(BaseModel):
    relevance: int = Field(default=80, ge=0, le=100)
    factual_accuracy: int = Field(default=80, ge=0, le=100)
    technical_completeness: int = Field(default=75, ge=0, le=100)
    clarity: int = Field(default=85, ge=0, le=100)
    logical_structure: int = Field(default=80, ge=0, le=100)
    depth: int = Field(default=70, ge=0, le=100)

class AnswerEvaluationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    overall_score: int
    rubric_scores: Dict[str, Any]
    strengths: List[str]
    missing_concepts: List[str]
    incorrect_statements: List[str]
    gap_explanation: Optional[str]
    suggested_answer: str
    recommended_structure: Optional[str]
    follow_up_questions: List[str]
    recommended_topics: List[str]
    transcript_evidence: List[Dict[str, Any]]
    evaluation_uncertainty: str

class CandidateAnswerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    answer_text: str
    start_time: float
    end_time: float
    speaker_tag: str
    word_count: int
    duration_seconds: float

class QuestionDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    question_index: int
    question_text: str
    category: str
    start_time: float
    end_time: float
    speaker_tag: str
    detection_confidence: float
    candidate_answer: Optional[CandidateAnswerOut] = None
    evaluation: Optional[AnswerEvaluationOut] = None

class CommunicationMetricsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    speaking_rate_wpm: float
    pause_count: int
    avg_pause_seconds: float
    filler_words_count: int
    filler_words_breakdown: Dict[str, int]
    repeated_words_count: int
    longest_answer_seconds: float
    shortest_answer_seconds: float
    total_speaking_seconds: float
    natural_language_coaching: str

class VisualObservationsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    is_opted_in: bool
    head_orientation_summary: str
    shoulder_alignment_summary: str
    camera_framing_summary: str
    camera_directed_gaze_summary: str
    movement_patterns_summary: str
    descriptive_observations: List[str]
    limitations_notice: str

class KnowledgeGapOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    topic_name: str
    related_question_id: Optional[str] = None
    category: str
    explanation: str
    why_it_matters: str
    priority: str
    study_activities: List[str]
    practice_questions: List[str]
    learning_resources: List[Dict[str, str]]
    status: str

class LearningTaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    day_number: int
    title: str
    description: str
    category: str
    topic_name: str
    estimated_minutes: int
    related_question_id: Optional[str] = None
    is_completed: bool
    completed_at: Optional[datetime] = None

class LearningPlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    target_role: str
    estimated_hours: float
    tasks: List[LearningTaskOut] = []

class ReportOut(BaseModel):
    interview: InterviewOut
    questions: List[QuestionDetailOut]
    communication: Optional[CommunicationMetricsOut] = None
    visual: Optional[VisualObservationsOut] = None
    knowledge_gaps: List[KnowledgeGapOut] = []
    learning_plan: Optional[LearningPlanOut] = None
    overall_performance_score: Optional[int] = None
    primary_strengths: List[str]
    critical_improvement_areas: List[str]

class PracticeQuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    source_type: str
    question_text: str
    category: str
    difficulty: str
    priority: str
    preparation_tips: Optional[str]
    expected_key_concepts: List[str]

class PracticeAttemptCreate(BaseModel):
    question_id: str
    transcript: str
    duration_seconds: float = 45.0

class PracticeAttemptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    question_id: str
    attempt_number: int
    transcript: str
    duration_seconds: float
    score: int
    strengths: List[str]
    addressed_gaps: List[str]
    remaining_gaps: List[str]
    feedback_text: str
    created_at: datetime
