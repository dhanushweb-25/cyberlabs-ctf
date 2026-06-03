from abc import ABC, abstractmethod
from sqlalchemy.orm import Session
from ..models import ChallengeInstance

class BaseProvider(ABC):
    @abstractmethod
    def start_lab(self, db: Session, user_id: int, challenge_id: int) -> ChallengeInstance:
        """
        Starts a challenge lab instance for a given user.
        """
        pass

    @abstractmethod
    def terminate_lab(self, db: Session, instance_id: int) -> None:
        """
        Terminates the given lab instance and cleans up resource usage.
        """
        pass
