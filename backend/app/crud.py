from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import List, Tuple, Optional
from . import models, schemas, auth

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserRegister):
    hashed_pwd = auth.get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        password_hash=hashed_pwd,
        points=0
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    update_ranks(db)
    return db_user

def update_user_last_login(db: Session, user: models.User):
    user.last_login = datetime.utcnow()
    db.commit()
    db.refresh(user)

def get_challenges(db: Session) -> List[models.Challenge]:
    return db.query(models.Challenge).all()

def get_challenge(db: Session, challenge_id: int) -> models.Challenge:
    return db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()

def get_flag_by_challenge_id(db: Session, challenge_id: int) -> models.Flag:
    return db.query(models.Flag).filter(models.Flag.challenge_id == challenge_id).first()

def has_solved_challenge(db: Session, user_id: int, challenge_id: int) -> bool:
    return db.query(models.Submission).filter(
        models.Submission.user_id == user_id,
        models.Submission.challenge_id == challenge_id,
        models.Submission.status == "Correct"
    ).first() is not None

def create_submission(db: Session, user_id: int, challenge_id: int, flag: str, status: str) -> models.Submission:
    submission = models.Submission(
        user_id=user_id,
        challenge_id=challenge_id,
        submitted_flag=flag,
        status=status
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission

def update_user_points(db: Session, user_id: int, points_to_add: int):
    user = get_user(db, user_id)
    if user:
        user.points += points_to_add
        db.commit()
        db.refresh(user)
        update_ranks(db)
    return user

def update_ranks(db: Session):
    # Retrieve all users sorted by points desc
    users = db.query(models.User).order_by(models.User.points.desc()).all()
    for index, user in enumerate(users):
        user.rank = index + 1
    db.commit()

def get_scoreboard(
    db: Session,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 10,
    sort_by: str = "points",
    sort_order: str = "desc"
) -> Tuple[List[schemas.ScoreboardEntry], int]:
    # Query correct submissions count and last activity per user
    subquery = db.query(
        models.Submission.user_id,
        func.count(models.Submission.id).label("solved_count"),
        func.max(models.Submission.submitted_at).label("last_active")
    ).filter(models.Submission.status == "Correct").group_by(models.Submission.user_id).subquery()

    query = db.query(
        models.User,
        func.coalesce(subquery.c.solved_count, 0).label("solved"),
        subquery.c.last_active.label("last_active")
    ).outerjoin(
        subquery, models.User.id == subquery.c.user_id
    )

    if search:
        query = query.filter(models.User.username.ilike(f"%{search}%"))

    # Determine sort attribute
    sort_attr = models.User.points
    if sort_by == "rank":
        sort_attr = models.User.rank
    elif sort_by == "username":
        sort_attr = models.User.username
    elif sort_by == "challenges_completed":
        sort_attr = func.coalesce(subquery.c.solved_count, 0)
    elif sort_by == "last_activity":
        sort_attr = func.coalesce(subquery.c.last_active, models.User.last_login, models.User.created_at)

    if sort_order == "asc":
        query = query.order_by(sort_attr.asc(), models.User.username.asc())
    else:
        query = query.order_by(sort_attr.desc(), models.User.username.asc())

    # Get total count before pagination using a distinct or subquery to prevent group_by/outerjoin issues on Postgres
    total = query.distinct().count()

    # Paginate
    offset = (page - 1) * limit
    results = query.offset(offset).limit(limit).all()

    entries = []
    for user, solved, last_active in results:
        entries.append(schemas.ScoreboardEntry(
            rank=user.rank or 0,
            username=user.username,
            points=user.points,
            challenges_completed=solved,
            last_activity=last_active or user.last_login or user.created_at
        ))

    return entries, total


def get_user_activity(db: Session, user_id: int) -> List[schemas.ActivityItem]:
    submissions = db.query(
        models.Submission,
        models.Challenge.title.label("challenge_title"),
        models.Challenge.points.label("challenge_points")
    ).join(
        models.Challenge, models.Submission.challenge_id == models.Challenge.id
    ).filter(
        models.Submission.user_id == user_id
    ).order_by(
        models.Submission.submitted_at.desc()
    ).limit(10).all()

    activity = []
    for sub, challenge_title, challenge_points in submissions:
        # Determine activity type
        if sub.status == "Correct":
            act_type = "Completed"
        else:
            act_type = "Submitted"
        
        activity.append(schemas.ActivityItem(
            type=act_type,
            challenge_title=challenge_title,
            timestamp=sub.submitted_at,
            points=challenge_points if act_type == "Completed" else 0,
            status=sub.status
        ))
    return activity
