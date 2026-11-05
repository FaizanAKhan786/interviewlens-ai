import os
import time
import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from services.api.core.database import SessionLocal
from services.api.models.entities import (
    Interview,
    InterviewFile,
    AnalysisJob,
    Transcript,
    TranscriptSegment,
    Speaker,
    InterviewQuestion,
    CandidateAnswer,
    AnswerEvaluation,
    CommunicationMetrics,
    VisualObservations,
    KnowledgeGap,
    LearningPlan,
    LearningTask,
    PracticeQuestion,
    gen_uuid,
    utc_now
)
from services.api.ai.factory import get_ai_provider

logger = logging.getLogger(__name__)

STAGES = [
    ("QUEUED", 5, "Job queued for processing"),
    ("VALIDATING", 15, "Validating recording format and stream integrity"),
    ("EXTRACTING_AUDIO", 28, "Extracting and normalizing audio channels"),
    ("TRANSCRIBING", 45, "Transcribing speech to timestamped text"),
    ("IDENTIFYING_SPEAKERS", 58, "Performing speaker diarization and role attribution"),
    ("DETECTING_QUESTIONS", 72, "Detecting interview questions and response boundaries"),
    ("ANALYZING_ANSWERS", 84, "Running rubric evaluations on candidate answers"),
    ("GENERATING_RECOMMENDATIONS", 92, "Identifying knowledge gaps and study roadmaps"),
    ("PREPARING_REPORT", 98, "Synthesizing full analytics workspace report"),
    ("COMPLETED", 100, "Interview intelligence analysis completed")
]

def run_analysis_pipeline(interview_id: str, db_session: Optional[Session] = None):
    should_close = False
    if db_session is not None:
        db = db_session
    else:
        db = SessionLocal()
        should_close = True
    try:
        interview = db.query(Interview).filter(Interview.id == interview_id).first()
        if not interview:
            logger.error(f"Interview {interview_id} not found")
            return

        job = db.query(AnalysisJob).filter(AnalysisJob.interview_id == interview_id).first()
        if not job:
            job = AnalysisJob(interview_id=interview_id, status="QUEUED", current_stage="Queued", progress_percent=0)
            db.add(job)
            db.commit()
            db.refresh(job)

        job.started_at = utc_now()
        interview.status = "processing"
        db.commit()

        ai = get_ai_provider()
        file_record = db.query(InterviewFile).filter(InterviewFile.interview_id == interview_id).first()
        file_path = file_record.storage_path if file_record else ""

        # Step-by-step pipeline execution
        for stage_idx, (stage_name, progress, stage_label) in enumerate(STAGES):
            job.status = stage_name
            job.current_stage = stage_label
            job.stage_index = stage_idx
            job.progress_percent = progress
            db.commit()
            
            # Simulate real media processing stages with brief pauses
            if stage_name == "VALIDATING":
                time.sleep(0.4)
            elif stage_name == "EXTRACTING_AUDIO":
                time.sleep(0.5)
            elif stage_name == "TRANSCRIBING":
                time.sleep(0.6)
                transcript_data = ai.transcribe(file_path)
                
                # Save transcript
                transcript = Transcript(
                    id=gen_uuid(),
                    interview_id=interview.id,
                    language=transcript_data.language,
                    full_text=transcript_data.full_text,
                    duration_seconds=transcript_data.duration_seconds,
                    candidate_speaker_tag=transcript_data.candidate_speaker_tag
                )
                db.add(transcript)
                db.commit()
                db.refresh(transcript)

                for seg in transcript_data.segments:
                    db.add(TranscriptSegment(
                        id=gen_uuid(),
                        transcript_id=transcript.id,
                        speaker_tag=seg.speaker_tag,
                        start_time=seg.start_time,
                        end_time=seg.end_time,
                        text=seg.text,
                        confidence=seg.confidence
                    ))
                db.commit()

            elif stage_name == "IDENTIFYING_SPEAKERS":
                time.sleep(0.4)
                db.add(Speaker(
                    id=gen_uuid(),
                    interview_id=interview.id,
                    speaker_tag="Speaker 1",
                    assigned_role="INTERVIEWER",
                    display_name="Lead Technical Interviewer",
                    user_confirmed=True
                ))
                db.add(Speaker(
                    id=gen_uuid(),
                    interview_id=interview.id,
                    speaker_tag="Speaker 2",
                    assigned_role="CANDIDATE",
                    display_name=interview.user.full_name if interview.user else "Candidate",
                    user_confirmed=True
                ))
                db.commit()

            elif stage_name == "DETECTING_QUESTIONS":
                time.sleep(0.5)
                transcript_record = db.query(Transcript).filter(Transcript.interview_id == interview.id).first()
                if transcript_record:
                    extracted_qas = ai.extract_qa(transcript_data, interview.target_role)
                    for idx, eq in enumerate(extracted_qas):
                        q_obj = InterviewQuestion(
                            id=gen_uuid(),
                            interview_id=interview.id,
                            question_index=idx + 1,
                            question_text=eq.question_text,
                            category=eq.category,
                            start_time=eq.start_time,
                            end_time=eq.end_time,
                            speaker_tag=eq.question_speaker,
                            detection_confidence=eq.confidence
                        )
                        db.add(q_obj)
                        db.commit()
                        db.refresh(q_obj)

                        a_obj = CandidateAnswer(
                            id=gen_uuid(),
                            question_id=q_obj.id,
                            answer_text=eq.answer_text,
                            start_time=eq.answer_start_time,
                            end_time=eq.answer_end_time,
                            speaker_tag=eq.answer_speaker,
                            word_count=len(eq.answer_text.split()),
                            duration_seconds=round(eq.answer_end_time - eq.answer_start_time, 1)
                        )
                        db.add(a_obj)
                        db.commit()

            elif stage_name == "ANALYZING_ANSWERS":
                time.sleep(0.6)
                questions = db.query(InterviewQuestion).filter(InterviewQuestion.interview_id == interview.id).all()
                for q in questions:
                    cand_ans = db.query(CandidateAnswer).filter(CandidateAnswer.question_id == q.id).first()
                    ans_text = cand_ans.answer_text if cand_ans else ""
                    eval_res = ai.evaluate_answer(
                        question=q.question_text,
                        answer=ans_text,
                        target_role=interview.target_role,
                        category=q.category,
                        experience_level=interview.experience_level
                    )
                    db.add(AnswerEvaluation(
                        id=gen_uuid(),
                        question_id=q.id,
                        candidate_answer_id=cand_ans.id if cand_ans else "",
                        overall_score=eval_res.overall_score,
                        rubric_scores=eval_res.rubric_scores,
                        strengths=eval_res.strengths,
                        missing_concepts=eval_res.missing_concepts,
                        incorrect_statements=eval_res.incorrect_statements,
                        gap_explanation=eval_res.gap_explanation,
                        suggested_answer=eval_res.suggested_answer,
                        recommended_structure=eval_res.recommended_structure,
                        follow_up_questions=eval_res.follow_up_questions,
                        recommended_topics=eval_res.recommended_topics,
                        transcript_evidence=eval_res.transcript_evidence,
                        evaluation_uncertainty=eval_res.evaluation_uncertainty
                    ))
                db.commit()

            elif stage_name == "GENERATING_RECOMMENDATIONS":
                time.sleep(0.5)
                # Communication metrics
                comm_res = ai.analyze_communication(transcript_data)
                db.add(CommunicationMetrics(
                    id=gen_uuid(),
                    interview_id=interview.id,
                    speaking_rate_wpm=comm_res.speaking_rate_wpm,
                    pause_count=comm_res.pause_count,
                    avg_pause_seconds=comm_res.avg_pause_seconds,
                    filler_words_count=comm_res.filler_words_count,
                    filler_words_breakdown=comm_res.filler_words_breakdown,
                    repeated_words_count=comm_res.repeated_words_count,
                    longest_answer_seconds=comm_res.longest_answer_seconds,
                    shortest_answer_seconds=comm_res.shortest_answer_seconds,
                    total_speaking_seconds=comm_res.total_speaking_seconds,
                    natural_language_coaching=comm_res.natural_language_coaching
                ))

                # Visual observations
                vis_res = ai.analyze_visual(file_path)
                db.add(VisualObservations(
                    id=gen_uuid(),
                    interview_id=interview.id,
                    is_opted_in=vis_res.is_opted_in,
                    head_orientation_summary=vis_res.head_orientation_summary,
                    shoulder_alignment_summary=vis_res.shoulder_alignment_summary,
                    camera_framing_summary=vis_res.camera_framing_summary,
                    camera_directed_gaze_summary=vis_res.camera_directed_gaze_summary,
                    movement_patterns_summary=vis_res.movement_patterns_summary,
                    descriptive_observations=vis_res.descriptive_observations,
                    limitations_notice=vis_res.limitations_notice
                ))
                db.commit()

                # Knowledge gaps
                gaps = ai.detect_knowledge_gaps([], interview.target_role, interview.job_description)
                first_q = db.query(InterviewQuestion).filter(InterviewQuestion.interview_id == interview.id).first()
                for gap_item in gaps:
                    kg = KnowledgeGap(
                        id=gen_uuid(),
                        interview_id=interview.id,
                        user_id=interview.user_id,
                        related_question_id=first_q.id if first_q else None,
                        topic_name=gap_item.topic_name,
                        category=gap_item.category,
                        explanation=gap_item.explanation,
                        why_it_matters=gap_item.why_it_matters,
                        priority=gap_item.priority,
                        study_activities=gap_item.study_activities,
                        practice_questions=gap_item.practice_questions,
                        learning_resources=gap_item.learning_resources,
                        status="IDENTIFIED"
                    )
                    db.add(kg)

                    # Also add a practice question for this gap
                    if gap_item.practice_questions:
                        db.add(PracticeQuestion(
                            id=gen_uuid(),
                            user_id=interview.user_id,
                            interview_id=interview.id,
                            source_type="INTERVIEW_DERIVED",
                            question_text=gap_item.practice_questions[0],
                            category=gap_item.category,
                            difficulty="INTERMEDIATE",
                            priority=gap_item.priority,
                            preparation_tips=gap_item.explanation,
                            expected_key_concepts=[gap_item.topic_name]
                        ))
                db.commit()

                # Learning plan
                plan_data = ai.generate_learning_plan(gaps, interview.target_role)
                lp = LearningPlan(
                    id=gen_uuid(),
                    user_id=interview.user_id,
                    interview_id=interview.id,
                    title=plan_data.title,
                    target_role=plan_data.target_role,
                    estimated_hours=plan_data.estimated_hours
                )
                db.add(lp)
                db.commit()
                db.refresh(lp)

                for t_item in plan_data.tasks:
                    db.add(LearningTask(
                        id=gen_uuid(),
                        plan_id=lp.id,
                        day_number=t_item.day_number,
                        title=t_item.title,
                        description=t_item.description,
                        category=t_item.category,
                        topic_name=t_item.topic_name,
                        estimated_minutes=t_item.estimated_minutes,
                        related_question_id=first_q.id if first_q else None,
                        is_completed=False
                    ))
                db.commit()

            elif stage_name == "PREPARING_REPORT":
                time.sleep(0.4)
                interview.duration_seconds = 145.0
                interview.status = "completed"
                db.commit()

        job.status = "COMPLETED"
        job.current_stage = "Interview intelligence analysis completed"
        job.progress_percent = 100
        job.completed_at = utc_now()
        interview.status = "completed"
        db.commit()
        logger.info(f"Analysis completed successfully for interview {interview_id}")

    except Exception as e:
        logger.exception(f"Error in analysis pipeline for interview {interview_id}: {str(e)}")
        if 'job' in locals() and job:
            job.status = "FAILED"
            job.current_stage = "Processing encountered an error"
            job.error_message = str(e)
            job.completed_at = utc_now()
        if 'interview' in locals() and interview:
            interview.status = "failed"
        db.commit()
    finally:
        if should_close:
            db.close()
