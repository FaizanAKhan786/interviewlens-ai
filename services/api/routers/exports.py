import os
import pymupdf
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from services.api.core.config import settings
from services.api.core.database import get_db
from services.api.core.deps import get_current_user
from services.api.models.entities import (
    User,
    Interview,
    InterviewQuestion,
    CandidateAnswer,
    AnswerEvaluation,
    CommunicationMetrics,
    KnowledgeGap,
    LearningPlan
)

router = APIRouter(prefix="/interviews", tags=["Exports"])

@router.get("/{interview_id}/export")
def export_interview_json(
    interview_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    interview = (
        db.query(Interview)
        .filter(Interview.id == interview_id, Interview.user_id == current_user.id)
        .first()
    )
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")

    questions = db.query(InterviewQuestion).filter(InterviewQuestion.interview_id == interview.id).all()
    q_data = []
    for q in questions:
        ans = db.query(CandidateAnswer).filter(CandidateAnswer.question_id == q.id).first()
        ev = db.query(AnswerEvaluation).filter(AnswerEvaluation.question_id == q.id).first()
        q_data.append({
            "index": q.question_index,
            "question": q.question_text,
            "category": q.category,
            "candidate_answer": ans.answer_text if ans else None,
            "evaluation": {
                "score": ev.overall_score if ev else None,
                "rubric": ev.rubric_scores if ev else None,
                "strengths": ev.strengths if ev else [],
                "missing_concepts": ev.missing_concepts if ev else [],
                "incorrect_statements": ev.incorrect_statements if ev else [],
                "gap_explanation": ev.gap_explanation if ev else None,
                "suggested_answer": ev.suggested_answer if ev else None,
                "follow_up_questions": ev.follow_up_questions if ev else []
            } if ev else None
        })

    comm = db.query(CommunicationMetrics).filter(CommunicationMetrics.interview_id == interview.id).first()
    gaps = db.query(KnowledgeGap).filter(KnowledgeGap.interview_id == interview.id).all()

    export_payload = {
        "platform": "InterviewLens AI",
        "tagline": "Every interview makes you better.",
        "export_version": "1.0",
        "interview": {
            "id": interview.id,
            "title": interview.title,
            "target_role": interview.target_role,
            "company_name": interview.company_name,
            "interview_date": interview.interview_date,
            "status": interview.status
        },
        "candidate": {
            "name": current_user.full_name,
            "email": current_user.email
        },
        "questions_and_evaluations": q_data,
        "communication_metrics": {
            "speaking_rate_wpm": comm.speaking_rate_wpm,
            "filler_words_count": comm.filler_words_count,
            "pause_count": comm.pause_count,
            "coaching": comm.natural_language_coaching
        } if comm else None,
        "knowledge_gaps": [
            {
                "topic": g.topic_name,
                "priority": g.priority,
                "explanation": g.explanation,
                "why_it_matters": g.why_it_matters,
                "study_activities": g.study_activities
            } for g in gaps
        ]
    }

    return JSONResponse(
        content=export_payload,
        headers={"Content-Disposition": f"attachment; filename=InterviewLens_{interview.id}.json"}
    )

@router.get("/{interview_id}/export/pdf")
def export_interview_pdf(
    interview_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    interview = (
        db.query(Interview)
        .filter(Interview.id == interview_id, Interview.user_id == current_user.id)
        .first()
    )
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")

    questions = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.interview_id == interview.id)
        .order_by(InterviewQuestion.question_index)
        .all()
    )
    comm = db.query(CommunicationMetrics).filter(CommunicationMetrics.interview_id == interview.id).first()
    gaps = db.query(KnowledgeGap).filter(KnowledgeGap.interview_id == interview.id).all()

    # Calculate the reported score from this interview's stored evaluations.
    # An interview without evaluated answers has no numeric score.
    evaluation_scores = [
        ev.overall_score
        for question in questions
        for ev in db.query(AnswerEvaluation)
        .filter(AnswerEvaluation.question_id == question.id)
        .all()
        if ev.overall_score is not None
    ]
    score_label = (
        f"{int(sum(evaluation_scores) / len(evaluation_scores))} / 100"
        if evaluation_scores else "Not evaluated"
    )

    # Build PyMuPDF document
    doc = pymupdf.open()
    
    # Page 1: Executive Overview
    p1 = doc.new_page(width=595, height=842) # A4
    
    # Header Banner Background
    p1.draw_rect(pymupdf.Rect(0, 0, 595, 120), color=(0.06, 0.09, 0.16), fill=(0.06, 0.09, 0.16))
    p1.insert_text((40, 48), "INTERVIEWLENS AI", fontsize=20, color=(1, 1, 1))
    p1.insert_text((40, 68), "Executive Interview Intelligence & Coaching Assessment", fontsize=11, color=(0.6, 0.7, 0.9))
    p1.insert_text((40, 92), f"Candidate: {current_user.full_name}  |  Target Role: {interview.target_role}", fontsize=10, color=(0.8, 0.85, 0.95))

    # Details Box
    y = 150
    p1.insert_text((40, y), f"Interview Title: {interview.title}", fontsize=14, color=(0.1, 0.15, 0.25))
    y += 24
    p1.insert_text((40, y), f"Target Company: {interview.company_name or 'N/A'}  |  Experience Level: {interview.experience_level.title()}", fontsize=11, color=(0.3, 0.35, 0.45))
    y += 35

    # Overall Score Card
    p1.draw_rect(pymupdf.Rect(40, y, 555, y + 80), color=(0.9, 0.92, 0.96), fill=(0.95, 0.97, 1.0))
    p1.insert_text((60, y + 30), "Overall Coaching Assessment Score", fontsize=12, color=(0.2, 0.3, 0.5))
    p1.insert_text((60, y + 62), score_label, fontsize=24, color=(0.2, 0.4, 0.9))
    p1.insert_text((220, y + 35), "Rubric-grounded evaluation evaluating technical accuracy, completeness,", fontsize=9, color=(0.3, 0.35, 0.45))
    p1.insert_text((220, y + 52), "clarity of reasoning, and delivery pace against role benchmarks.", fontsize=9, color=(0.3, 0.35, 0.45))
    y += 105

    # Communication Overview
    if comm:
        p1.insert_text((40, y), "Speech & Communication Measurements", fontsize=13, color=(0.1, 0.15, 0.25))
        y += 20
        p1.insert_text((40, y), f"- Speaking Pace: {comm.speaking_rate_wpm} WPM (Target: 130-160 WPM)", fontsize=10, color=(0.2, 0.25, 0.35))
        y += 16
        p1.insert_text((40, y), f"- Filler Word Count: {comm.filler_words_count} tokens recorded", fontsize=10, color=(0.2, 0.25, 0.35))
        y += 16
        p1.insert_text((40, y), f"- Pause Profile: {comm.pause_count} deliberate transition pauses", fontsize=10, color=(0.2, 0.25, 0.35))
        y += 25
        p1.insert_text((40, y), "Coaching Recommendation:", fontsize=10, color=(0.15, 0.2, 0.3))
        y += 15
        p1.insert_textbox(pymupdf.Rect(40, y, 555, y + 60), comm.natural_language_coaching, fontsize=9, color=(0.25, 0.3, 0.4))
        y += 75

    # Knowledge Gaps
    if gaps:
        p1.insert_text((40, y), "Identified Knowledge Gaps & Priority Focus", fontsize=13, color=(0.1, 0.15, 0.25))
        y += 20
        for g in gaps[:3]:
            p1.insert_text((40, y), f"• [{g.priority}] {g.topic_name}", fontsize=10, color=(0.8, 0.2, 0.2) if g.priority=="HIGH" else (0.2, 0.4, 0.8))
            y += 14
            p1.insert_text((55, y), f"Gap: {g.explanation[:120]}...", fontsize=9, color=(0.3, 0.35, 0.45))
            y += 18

    # Page 2: Question-by-Question Deep Dive
    p2 = doc.new_page(width=595, height=842)
    p2.draw_rect(pymupdf.Rect(0, 0, 595, 60), color=(0.06, 0.09, 0.16), fill=(0.06, 0.09, 0.16))
    p2.insert_text((40, 38), "QUESTION-BY-QUESTION EVALUATION BREAKDOWN", fontsize=14, color=(1, 1, 1))

    y2 = 80
    for q in questions[:3]:
        ans = db.query(CandidateAnswer).filter(CandidateAnswer.question_id == q.id).first()
        ev = db.query(AnswerEvaluation).filter(AnswerEvaluation.question_id == q.id).first()

        p2.draw_rect(pymupdf.Rect(40, y2, 555, y2 + 200), color=(0.88, 0.9, 0.94), fill=(0.98, 0.98, 1.0))
        p2.insert_text((50, y2 + 20), f"Q{q.question_index}: {q.question_text[:85]}", fontsize=11, color=(0.1, 0.15, 0.3))
        p2.insert_text((50, y2 + 35), f"Category: {q.category}  |  Score: {ev.overall_score if ev else 'N/A'}/100", fontsize=9, color=(0.3, 0.4, 0.6))
        
        # Candidate Answer Snippet
        p2.insert_text((50, y2 + 55), "Candidate Answer:", fontsize=9, color=(0.2, 0.2, 0.2))
        ans_text = (ans.answer_text[:210] + "...") if ans else "N/A"
        p2.insert_textbox(pymupdf.Rect(50, y2 + 60, 545, y2 + 100), ans_text, fontsize=8.5, color=(0.3, 0.35, 0.45))

        # Missing Concepts
        if ev and ev.missing_concepts:
            p2.insert_text((50, y2 + 112), f"Missing Key Concepts: {', '.join(ev.missing_concepts[:2])}", fontsize=8.5, color=(0.75, 0.15, 0.15))

        # Suggested Answer
        if ev and ev.suggested_answer:
            p2.insert_text((50, y2 + 130), "Recommended Answer Framework:", fontsize=8.5, color=(0.1, 0.45, 0.25))
            p2.insert_textbox(pymupdf.Rect(50, y2 + 135, 545, y2 + 190), ev.suggested_answer[:220] + "...", fontsize=8, color=(0.25, 0.3, 0.35))

        y2 += 215

    pdf_bytes = doc.tobytes()
    doc.close()
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=InterviewLens_Report_{interview.id}.pdf"}
    )
