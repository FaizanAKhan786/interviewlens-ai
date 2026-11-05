from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from services.api.core.database import get_db
from services.api.core.deps import get_current_user
from services.api.models.entities import (
    User,
    PracticeQuestion,
    PracticeAttempt,
    KnowledgeGap,
    gen_uuid
)
from services.api.schemas.interview import (
    PracticeQuestionOut,
    PracticeAttemptCreate,
    PracticeAttemptOut
)
from services.api.ai.factory import get_ai_provider

router = APIRouter(prefix="", tags=["Practice Studio"])

@router.get("/practice-questions", response_model=List[PracticeQuestionOut])
def list_practice_questions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    questions = (
        db.query(PracticeQuestion)
        .filter((PracticeQuestion.user_id == current_user.id) | (PracticeQuestion.user_id == None))
        .order_by(PracticeQuestion.created_at.desc())
        .all()
    )
    if not questions:
        # Default starter questions if none generated yet
        default_q = PracticeQuestion(
            id=gen_uuid(),
            user_id=current_user.id,
            source_type="ROLE_DEFAULT",
            question_text="How would you design a scalable hybrid retrieval system combining dense vector embeddings and BM25?",
            category="Generative AI & LLM Systems",
            difficulty="INTERMEDIATE",
            priority="HIGH",
            preparation_tips="Highlight Reciprocal Rank Fusion (RRF), latency overhead of rerankers, and exact keyword retrieval.",
            expected_key_concepts=["Hybrid Search", "BM25", "Vector Embeddings", "Reranking"]
        )
        db.add(default_q)
        db.commit()
        questions = [default_q]

    return [PracticeQuestionOut.model_validate(q) for q in questions]

@router.post("/practice-attempts", response_model=PracticeAttemptOut, status_code=status.HTTP_201_CREATED)
def submit_practice_attempt(
    attempt_in: PracticeAttemptCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    question = db.query(PracticeQuestion).filter(PracticeQuestion.id == attempt_in.question_id).first()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Practice question not found")

    # Look up previous attempts to determine attempt number and previous answer
    prev_attempts = (
        db.query(PracticeAttempt)
        .filter(PracticeAttempt.question_id == question.id, PracticeAttempt.user_id == current_user.id)
        .order_by(PracticeAttempt.attempt_number.desc())
        .all()
    )
    attempt_num = (prev_attempts[0].attempt_number + 1) if prev_attempts else 1
    prev_answer = prev_attempts[0].transcript if prev_attempts else ""

    # Look up related knowledge gaps to evaluate improvement
    related_gaps = (
        db.query(KnowledgeGap)
        .filter(KnowledgeGap.user_id == current_user.id)
        .all()
    )
    gap_names = [g.topic_name for g in related_gaps] or question.expected_key_concepts or ["RAG Evaluation", "Hybrid Retrieval"]

    ai = get_ai_provider()
    eval_result = ai.evaluate_practice_attempt(
        question=question.question_text,
        previous_answer=prev_answer,
        previous_gaps=gap_names,
        new_answer=attempt_in.transcript
    )

    # If gaps were addressed, mark those knowledge gaps as IN_PROGRESS or MASTERED
    for gap in related_gaps:
        if gap.topic_name in eval_result.addressed_gaps:
            gap.status = "MASTERED" if eval_result.score >= 85 else "IN_PROGRESS"

    attempt = PracticeAttempt(
        id=gen_uuid(),
        question_id=question.id,
        user_id=current_user.id,
        attempt_number=attempt_num,
        transcript=attempt_in.transcript,
        duration_seconds=attempt_in.duration_seconds,
        score=eval_result.score,
        strengths=eval_result.strengths,
        addressed_gaps=eval_result.addressed_gaps,
        remaining_gaps=eval_result.remaining_gaps,
        feedback_text=eval_result.feedback_text
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return PracticeAttemptOut.model_validate(attempt)

@router.get("/practice-attempts/{attempt_id}", response_model=PracticeAttemptOut)
def get_practice_attempt(
    attempt_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    attempt = (
        db.query(PracticeAttempt)
        .filter(PracticeAttempt.id == attempt_id, PracticeAttempt.user_id == current_user.id)
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Practice attempt not found")
    return PracticeAttemptOut.model_validate(attempt)

@router.get("/practice-questions/{question_id}/attempts", response_model=List[PracticeAttemptOut])
def get_attempts_for_question(
    question_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    attempts = (
        db.query(PracticeAttempt)
        .filter(PracticeAttempt.question_id == question_id, PracticeAttempt.user_id == current_user.id)
        .order_by(PracticeAttempt.attempt_number.asc())
        .all()
    )
    return [PracticeAttemptOut.model_validate(a) for a in attempts]
