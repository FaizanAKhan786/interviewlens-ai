from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class SegmentData(BaseModel):
    speaker_tag: str
    start_time: float
    end_time: float
    text: str
    confidence: float = 0.95

class TranscriptData(BaseModel):
    language: str = "en"
    duration_seconds: float
    segments: List[SegmentData]
    full_text: str
    candidate_speaker_tag: str = "Speaker 2"

class ExtractedQA(BaseModel):
    question_text: str
    category: str
    start_time: float
    end_time: float
    question_speaker: str
    answer_text: str
    answer_start_time: float
    answer_end_time: float
    answer_speaker: str
    confidence: float

class EvaluationResult(BaseModel):
    overall_score: int
    rubric_scores: Dict[str, int]
    strengths: List[str]
    missing_concepts: List[str]
    incorrect_statements: List[str]
    gap_explanation: str
    suggested_answer: str
    recommended_structure: str
    follow_up_questions: List[str]
    recommended_topics: List[str]
    transcript_evidence: List[Dict[str, Any]]
    evaluation_uncertainty: str = "Low"

class CommunicationResult(BaseModel):
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

class VisualResult(BaseModel):
    is_opted_in: bool = True
    head_orientation_summary: str
    shoulder_alignment_summary: str
    camera_framing_summary: str
    camera_directed_gaze_summary: str
    movement_patterns_summary: str
    descriptive_observations: List[str]
    limitations_notice: str

class KnowledgeGapItem(BaseModel):
    topic_name: str
    related_question_index: Optional[int] = None
    category: str
    explanation: str
    why_it_matters: str
    priority: str  # HIGH, MEDIUM, LOW
    study_activities: List[str]
    practice_questions: List[str]
    learning_resources: List[Dict[str, str]]

class LearningTaskItem(BaseModel):
    day_number: int
    title: str
    description: str
    category: str
    topic_name: str
    estimated_minutes: int
    related_question_index: Optional[int] = None

class LearningPlanData(BaseModel):
    title: str
    target_role: str
    estimated_hours: float
    tasks: List[LearningTaskItem]

class PracticeEvaluationResult(BaseModel):
    score: int
    strengths: List[str]
    addressed_gaps: List[str]
    remaining_gaps: List[str]
    feedback_text: str

class BaseAIProvider(ABC):
    @abstractmethod
    def transcribe(self, file_path: str) -> TranscriptData:
        pass

    @abstractmethod
    def extract_qa(self, transcript: TranscriptData, target_role: str) -> List[ExtractedQA]:
        pass

    @abstractmethod
    def evaluate_answer(
        self, 
        question: str, 
        answer: str, 
        target_role: str, 
        category: str,
        experience_level: str = "mid"
    ) -> EvaluationResult:
        pass

    @abstractmethod
    def analyze_communication(self, transcript: TranscriptData) -> CommunicationResult:
        pass

    @abstractmethod
    def analyze_visual(self, file_path: str) -> VisualResult:
        pass

    @abstractmethod
    def detect_knowledge_gaps(
        self, 
        qa_evaluations: List[Dict[str, Any]], 
        target_role: str,
        job_description: Optional[str] = None
    ) -> List[KnowledgeGapItem]:
        pass

    @abstractmethod
    def generate_learning_plan(
        self, 
        knowledge_gaps: List[KnowledgeGapItem], 
        target_role: str
    ) -> LearningPlanData:
        pass

    @abstractmethod
    def evaluate_practice_attempt(
        self, 
        question: str, 
        previous_answer: str, 
        previous_gaps: List[str], 
        new_answer: str
    ) -> PracticeEvaluationResult:
        pass
