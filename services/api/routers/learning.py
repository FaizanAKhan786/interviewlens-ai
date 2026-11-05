from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from services.api.core.database import get_db
from services.api.core.deps import get_current_user
from services.api.models.entities import User, LearningPlan, LearningTask, KnowledgeGap, utc_now
from services.api.schemas.interview import LearningPlanOut, LearningTaskOut, KnowledgeGapOut

router = APIRouter(prefix="", tags=["Learning Roadmap"])

@router.get("/learning-plans", response_model=List[LearningPlanOut])
def list_learning_plans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    plans = (
        db.query(LearningPlan)
        .filter(LearningPlan.user_id == current_user.id)
        .order_by(LearningPlan.created_at.desc())
        .all()
    )
    return [LearningPlanOut.model_validate(p) for p in plans]

@router.get("/learning-plans/{plan_id}", response_model=LearningPlanOut)
def get_learning_plan(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    plan = (
        db.query(LearningPlan)
        .filter(LearningPlan.id == plan_id, LearningPlan.user_id == current_user.id)
        .first()
    )
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learning plan not found")
    return LearningPlanOut.model_validate(plan)

@router.patch("/learning-tasks/{task_id}", response_model=LearningTaskOut)
def toggle_learning_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = (
        db.query(LearningTask)
        .join(LearningPlan, LearningTask.plan_id == LearningPlan.id)
        .filter(LearningTask.id == task_id, LearningPlan.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    task.is_completed = not task.is_completed
    task.completed_at = utc_now() if task.is_completed else None
    db.commit()
    db.refresh(task)

    return LearningTaskOut.model_validate(task)

@router.get("/knowledge-gaps", response_model=List[KnowledgeGapOut])
def list_knowledge_gaps(
    priority: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(KnowledgeGap).filter(KnowledgeGap.user_id == current_user.id)
    if priority:
        query = query.filter(KnowledgeGap.priority == priority.upper())
    
    gaps = query.order_by(KnowledgeGap.created_at.desc()).all()
    return [KnowledgeGapOut.model_validate(g) for g in gaps]
