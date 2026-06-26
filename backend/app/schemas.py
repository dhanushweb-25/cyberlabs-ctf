from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None

# User Schemas
class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    confirm_password: str

class UserLogin(BaseModel):
    username: str  # Can be username or email
    password: str
    remember_me: Optional[bool] = False

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    points: int
    rank: Optional[int] = None
    created_at: datetime
    current_streak: int
    longest_streak: int
    last_solve_date: Optional[datetime] = None

    class Config:
        from_attributes = True

# Challenge Schemas
class ChallengeResponse(BaseModel):
    id: int
    title: str
    description: str
    difficulty: str
    points: int
    category: str
    estimated_time: str
    provider_type: str
    hint: Optional[str] = None
    created_at: datetime
    is_solved: Optional[bool] = False

    class Config:
        from_attributes = True

# Submission Schemas
class SubmissionRequest(BaseModel):
    submitted_flag: str

class SubmissionResponse(BaseModel):
    status: str  # Correct, Incorrect
    submitted_flag: str
    submitted_at: datetime

    class Config:
        from_attributes = True

class FlagSubmitResult(BaseModel):
    correct: bool
    message: str
    points_earned: int
    new_total_points: int

# Scoreboard Schemas
class ScoreboardEntry(BaseModel):
    rank: int
    username: str
    points: int
    challenges_completed: int
    last_activity: Optional[datetime] = None

class ScoreboardResponse(BaseModel):
    entries: List[ScoreboardEntry]
    total: int
    page: int
    limit: int


# Profile & Dashboard Activity
class ActivityItem(BaseModel):
    type: str  # "Started", "Submitted", "Completed"
    challenge_title: str
    timestamp: datetime
    points: Optional[int] = None
    status: Optional[str] = None

class UserProfileDetails(BaseModel):
    username: str
    email: str
    join_date: datetime
    points: int
    rank: int
    completed_challenges: int
    total_challenges: int
    progress_percentage: float
    recent_activities: List[ActivityItem]
    is_admin: bool
    current_streak: int
    longest_streak: int
    last_solve_date: Optional[datetime] = None


# Challenge Instance Schemas
class ChallengeInstanceResponse(BaseModel):
    id: int
    user_id: int
    challenge_id: int
    instance_name: str
    status: str
    port: Optional[int] = None
    created_at: datetime
    expires_at: datetime
    active_seconds_remaining: int

    class Config:
        from_attributes = True

# Audit Log Schemas
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    action: str
    details: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class AuditLogListResponse(BaseModel):
    logs: List[AuditLogResponse]
    total: int

# Admin Dashboard Schemas
class AdminStatsResponse(BaseModel):
    total_users: int
    active_users_24h: int
    active_containers: int
    completed_challenges: int
    points_awarded: int

class AdminContainerResponse(BaseModel):
    id: int
    username: str
    challenge_title: str
    instance_name: str
    status: str
    created_at: datetime
    expires_at: datetime

    class Config:
        from_attributes = True

