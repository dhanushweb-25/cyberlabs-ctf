from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from ..database import get_db
from .. import schemas, crud

router = APIRouter(prefix="/api/scoreboard", tags=["scoreboard"])

@router.get("", response_model=schemas.ScoreboardResponse)
def get_scoreboard(
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None, description="Filter by username"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("points", description="Field to sort by"),
    sort_order: str = Query("desc", description="Sort direction (asc or desc)")
):
    # Refresh ranks dynamically
    crud.update_ranks(db)
    entries, total = crud.get_scoreboard(
        db, search=search, page=page, limit=limit, sort_by=sort_by, sort_order=sort_order
    )
    return schemas.ScoreboardResponse(
        entries=entries,
        total=total,
        page=page,
        limit=limit
    )

