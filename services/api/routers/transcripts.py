from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from services.api.core.database import get_db
from services.api.core.deps import get_current_user
from services.api.models.entities import User, Interview, Transcript, TranscriptSegment
from services.api.schemas.interview import TranscriptOut, TranscriptSegmentOut, TranscriptUpdate, SpeakerAssignRequest
from services.worker.pipeline import run_analysis_pipeline

router = APIRouter(prefix="/interviews", tags=["Transcripts"])

@router.get("/{interview_id}/transcript", response_model=TranscriptOut)
def get_transcript(
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

    transcript = db.query(Transcript).filter(Transcript.interview_id == interview.id).first()
    if not transcript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transcript not ready yet")

    segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.transcript_id == transcript.id)
        .order_by(TranscriptSegment.start_time)
        .all()
    )

    return TranscriptOut(
        id=transcript.id,
        interview_id=interview.id,
        language=transcript.language,
        full_text=transcript.full_text,
        duration_seconds=transcript.duration_seconds,
        candidate_speaker_tag=transcript.candidate_speaker_tag,
        segments=[TranscriptSegmentOut.model_validate(s) for s in segments]
    )

@router.patch("/{interview_id}/transcript", response_model=TranscriptOut)
def update_transcript(
    interview_id: str,
    update_in: TranscriptUpdate,
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

    transcript = db.query(Transcript).filter(Transcript.interview_id == interview.id).first()
    if not transcript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transcript not found")

    if update_in.full_text is not None:
        transcript.full_text = update_in.full_text
    if update_in.candidate_speaker_tag is not None:
        transcript.candidate_speaker_tag = update_in.candidate_speaker_tag

    db.commit()
    db.refresh(transcript)

    segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.transcript_id == transcript.id)
        .order_by(TranscriptSegment.start_time)
        .all()
    )

    return TranscriptOut(
        id=transcript.id,
        interview_id=interview.id,
        language=transcript.language,
        full_text=transcript.full_text,
        duration_seconds=transcript.duration_seconds,
        candidate_speaker_tag=transcript.candidate_speaker_tag,
        segments=[TranscriptSegmentOut.model_validate(s) for s in segments]
    )

@router.post("/{interview_id}/speakers/assign")
def assign_speaker(
    interview_id: str,
    assign_in: SpeakerAssignRequest,
    background_tasks: BackgroundTasks,
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

    transcript = db.query(Transcript).filter(Transcript.interview_id == interview.id).first()
    if transcript:
        transcript.candidate_speaker_tag = assign_in.candidate_speaker_tag
        db.commit()

    # Re-run pipeline with the corrected speaker designation
    background_tasks.add_task(run_analysis_pipeline, interview.id)

    return {
        "message": f"Assigned candidate to '{assign_in.candidate_speaker_tag}'. Re-analysis queued.",
        "candidate_speaker_tag": assign_in.candidate_speaker_tag
    }
