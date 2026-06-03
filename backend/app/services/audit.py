import logging
from sqlalchemy.orm import Session
from ..models import AuditLog

logger = logging.getLogger(__name__)

def log_action(db: Session, user_id: int, action: str, details: str = None):
    try:
        log = AuditLog(
            user_id=user_id,
            action=action,
            details=details
        )
        db.add(log)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log audit action '{action}' for user {user_id}: {e}")
        db.rollback()
