from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from ..database import get_db
from .. import schemas, crud, auth, models

router = APIRouter(prefix="/api", tags=["authentication"])

@router.post("/register", response_model=schemas.UserResponse)
def register_user(user_in: schemas.UserRegister, db: Session = Depends(get_db)):
    if user_in.password != user_in.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    # Check if username exists
    db_user = crud.get_user_by_username(db, user_in.username)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
        
    # Check if email exists
    db_email = crud.get_user_by_email(db, user_in.email)
    if db_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
        
    return crud.create_user(db, user_in)

@router.post("/login", response_model=schemas.Token)
def login_user(login_in: schemas.UserLogin, db: Session = Depends(get_db)):
    # Authenticate via username or email
    user = crud.get_user_by_username(db, login_in.username)
    if not user:
        user = crud.get_user_by_email(db, login_in.username)
        
    if not user or not auth.verify_password(login_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect username/email or password"
        )
        
    # Update last login time
    crud.update_user_last_login(db, user)
    
    # Generate Access Token
    access_token_expires = None
    if login_in.remember_me:
        # Long-lived token (e.g. 7 days)
        access_token_expires = timedelta(days=7)
        
    access_token = auth.create_access_token(
        data={"sub": user.username, "user_id": user.id},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
def logout_user(current_user: models.User = Depends(auth.get_current_user)):
    # JWT is stateless, so we just send success. The frontend will delete the token.
    return {"message": "Successfully logged out"}

@router.get("/profile", response_model=schemas.UserProfileDetails)
def get_profile(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    # Calculate completed challenges
    completed_submissions = db.query(models.Submission.challenge_id).filter(
        models.Submission.user_id == current_user.id,
        models.Submission.status == "Correct"
    ).distinct().count()
    
    total_challenges = db.query(models.Challenge).count()
    progress_percentage = (completed_submissions / total_challenges * 100) if total_challenges > 0 else 0.0
    
    activities = crud.get_user_activity(db, current_user.id)
    
    # Refresh rank cache
    crud.update_ranks(db)
    user_refreshed = crud.get_user(db, current_user.id)
    
    return schemas.UserProfileDetails(
        username=user_refreshed.username,
        email=user_refreshed.email,
        join_date=user_refreshed.created_at,
        points=user_refreshed.points,
        rank=user_refreshed.rank or 9999,
        completed_challenges=completed_submissions,
        total_challenges=total_challenges,
        progress_percentage=round(progress_percentage, 1),
        recent_activities=activities,
        is_admin=user_refreshed.is_admin
    )
