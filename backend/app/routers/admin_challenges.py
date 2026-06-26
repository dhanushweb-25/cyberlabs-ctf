from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import logging
from ..database import get_db
from .. import models, auth
from ..services.audit import log_action

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/challenges", tags=["admin-challenges"])

class ChallengeCreate(BaseModel):
    title: str
    description: str
    difficulty: str  # Easy, Medium, Hard
    points: int
    category: str
    estimated_time: str
    provider_type: str  # docker, gcp
    flag_value: str
    hint: Optional[str] = None

class ChallengeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = None
    points: Optional[int] = None
    category: Optional[str] = None
    estimated_time: Optional[str] = None
    provider_type: Optional[str] = None
    flag_value: Optional[str] = None
    hint: Optional[str] = None

def check_admin(current_user: models.User = Depends(auth.get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required"
        )
    return current_user

@router.post("")
def create_challenge(
    req: ChallengeCreate,
    current_user: models.User = Depends(check_admin),
    db: Session = Depends(get_db)
):
    try:
        # Create Challenge
        db_challenge = models.Challenge(
            title=req.title,
            description=req.description,
            difficulty=req.difficulty,
            points=req.points,
            category=req.category,
            estimated_time=req.estimated_time,
            provider_type=req.provider_type,
            hint=req.hint
        )
        db.add(db_challenge)
        db.commit()
        db.refresh(db_challenge)

        # Create associated Flag
        db_flag = models.Flag(
            challenge_id=db_challenge.id,
            flag_value=req.flag_value
        )
        db.add(db_flag)
        db.commit()

        log_action(db, current_user.id, "Create Challenge", f"Created challenge '{req.title}' (ID: {db_challenge.id})")
        return {"message": "Challenge created successfully", "challenge_id": db_challenge.id}
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating challenge: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create challenge: {str(e)}")

@router.put("/{challenge_id}")
def update_challenge(
    challenge_id: int,
    req: ChallengeUpdate,
    current_user: models.User = Depends(check_admin),
    db: Session = Depends(get_db)
):
    db_challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not db_challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    try:
        # Update Challenge fields
        if req.title is not None:
            db_challenge.title = req.title
        if req.description is not None:
            db_challenge.description = req.description
        if req.difficulty is not None:
            db_challenge.difficulty = req.difficulty
        if req.points is not None:
            db_challenge.points = req.points
        if req.category is not None:
            db_challenge.category = req.category
        if req.estimated_time is not None:
            db_challenge.estimated_time = req.estimated_time
        if req.provider_type is not None:
            db_challenge.provider_type = req.provider_type
        if req.hint is not None:
            db_challenge.hint = req.hint

        # Update Flag value if provided
        if req.flag_value is not None:
            db_flag = db.query(models.Flag).filter(models.Flag.challenge_id == challenge_id).first()
            if db_flag:
                db_flag.flag_value = req.flag_value
            else:
                db_flag = models.Flag(challenge_id=challenge_id, flag_value=req.flag_value)
                db.add(db_flag)

        db.commit()
        log_action(db, current_user.id, "Update Challenge", f"Updated challenge '{db_challenge.title}' (ID: {challenge_id})")
        return {"message": "Challenge updated successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating challenge: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update challenge: {str(e)}")

@router.delete("/{challenge_id}")
def delete_challenge(
    challenge_id: int,
    current_user: models.User = Depends(check_admin),
    db: Session = Depends(get_db)
):
    db_challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not db_challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    try:
        title = db_challenge.title
        db.delete(db_challenge)
        db.commit()
        log_action(db, current_user.id, "Delete Challenge", f"Deleted challenge '{title}' (ID: {challenge_id})")
        return {"message": "Challenge deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting challenge: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete challenge: {str(e)}")
