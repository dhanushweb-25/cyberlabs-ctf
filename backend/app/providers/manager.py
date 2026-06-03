import logging
from sqlalchemy.orm import Session
from ..models import Challenge, ChallengeInstance
from .docker_provider import DockerProvider
from .gcp_provider import GCPProvider

logger = logging.getLogger(__name__)

class ProviderManager:
    def __init__(self):
        self.docker_provider = DockerProvider()
        self.gcp_provider = GCPProvider()

    def get_provider(self, provider_type: str):
        if provider_type == "gcp":
            return self.gcp_provider
        return self.docker_provider

    def ensure_images(self):
        self.docker_provider.ensure_images()

    def start_instance(self, db: Session, user_id: int, challenge_id: int) -> ChallengeInstance:
        challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
        if not challenge:
            raise Exception(f"Challenge ID {challenge_id} not found")

        provider_type = challenge.provider_type or "docker"
        logger.info(f"Routing start request for challenge {challenge_id} to provider {provider_type}")
        
        provider = self.get_provider(provider_type)
        return provider.start_lab(db, user_id, challenge_id)

    def terminate_instance(self, db: Session, instance_id: int):
        instance = db.query(ChallengeInstance).filter(ChallengeInstance.id == instance_id).first()
        if not instance:
            return

        challenge = db.query(Challenge).filter(Challenge.id == instance.challenge_id).first()
        provider_type = "docker"
        if challenge:
            provider_type = challenge.provider_type or "docker"

        logger.info(f"Routing terminate request for instance {instance.instance_name} to provider {provider_type}")
        provider = self.get_provider(provider_type)
        provider.terminate_lab(db, instance_id)

provider_manager = ProviderManager()
