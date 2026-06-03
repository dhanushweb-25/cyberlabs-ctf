from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
from ..database import get_db
from .. import schemas, auth, models, crud
from ..providers.manager import provider_manager

router = APIRouter(prefix="/api/admin", tags=["admin"])

def get_current_admin(current_user: models.User = Depends(auth.get_current_user)) -> models.User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Administrator privileges required."
        )
    return current_user

@router.get("/stats", response_model=schemas.AdminStatsResponse)
def get_admin_stats(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    # Total Users
    total_users = db.query(models.User).count()
    
    # Active Users (last 24 hours)
    one_day_ago = datetime.utcnow() - timedelta(days=1)
    active_users_24h = db.query(models.User).filter(
        models.User.last_login >= one_day_ago
    ).count()
    
    # Active Containers
    active_containers = db.query(models.ChallengeInstance).filter(
        models.ChallengeInstance.status == "Running"
    ).count()
    
    # Completed Challenges
    completed_challenges = db.query(models.ChallengeProgress).filter(
        models.ChallengeProgress.completed == True
    ).count()
    
    # Points Awarded
    points_awarded = db.query(func.sum(models.User.points)).scalar() or 0
    
    return schemas.AdminStatsResponse(
        total_users=total_users,
        active_users_24h=active_users_24h,
        active_containers=active_containers,
        completed_challenges=completed_challenges,
        points_awarded=points_awarded
    )

@router.get("/instances", response_model=List[schemas.AdminContainerResponse])
def get_active_instances(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    # Retrieve all running container instances with challenge details and usernames
    instances = db.query(
        models.ChallengeInstance,
        models.User.username.label("username"),
        models.Challenge.title.label("challenge_title")
    ).join(
        models.User, models.ChallengeInstance.user_id == models.User.id
    ).join(
        models.Challenge, models.ChallengeInstance.challenge_id == models.Challenge.id
    ).filter(
        models.ChallengeInstance.status == "Running"
    ).all()
    
    result = []
    for inst, username, challenge_title in instances:
        result.append(schemas.AdminContainerResponse(
            id=inst.id,
            username=username,
            challenge_title=challenge_title,
            instance_name=inst.instance_name,
            status=inst.status,
            created_at=inst.created_at,
            expires_at=inst.expires_at
        ))
    return result

@router.post("/instances/terminate/{id}")
def terminate_instance_by_admin(
    id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    instance = db.query(models.ChallengeInstance).filter(models.ChallengeInstance.id == id).first()
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")
        
    provider_manager.terminate_instance(db, instance.id)
    return {"message": f"Successfully terminated container instance {instance.instance_name}"}

@router.get("/audit", response_model=schemas.AuditLogListResponse)
def get_audit_logs(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
    action: Optional[str] = Query(None),
    username: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    query = db.query(
        models.AuditLog,
        models.User.username.label("username")
    ).outerjoin(
        models.User, models.AuditLog.user_id == models.User.id
    )
    
    if action:
        query = query.filter(models.AuditLog.action == action)
    if username:
        query = query.filter(models.User.username.ilike(f"%{username}%"))
        
    # Sort newest first
    query = query.order_by(models.AuditLog.timestamp.desc())
    
    total = query.count()
    offset = (page - 1) * limit
    results = query.offset(offset).limit(limit).all()
    
    logs = []
    for log, uname in results:
        logs.append(schemas.AuditLogResponse(
            id=log.id,
            user_id=log.user_id,
            username=uname,
            action=log.action,
            details=log.details,
            timestamp=log.timestamp
        ))
        
    return schemas.AuditLogListResponse(logs=logs, total=total)
