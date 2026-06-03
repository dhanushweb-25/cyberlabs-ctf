import os
import logging
import datetime
from sqlalchemy.orm import Session
from ..models import ChallengeInstance, Challenge, AuditLog
from .base import BaseProvider
import docker

logger = logging.getLogger(__name__)

# Config
CHALLENGE_MAP = {
    1: {"image": "ctf-challenge-navigation", "path": "/challenges/linux-navigation"},
    2: {"image": "ctf-challenge-permissions", "path": "/challenges/linux-permissions"},
    3: {"image": "ctf-challenge-users-groups", "path": "/challenges/users-groups"},
    4: {"image": "ctf-challenge-log-analysis", "path": "/challenges/log-analysis"},
    5: {"image": "ctf-challenge-cron-jobs", "path": "/challenges/cron-jobs"}
}

NETWORK_NAME = "ctf_network"

class DockerProvider(BaseProvider):
    def __init__(self):
        try:
            self.client = docker.from_env()
            logger.info("Connected to Docker environment successfully.")
        except Exception as e:
            logger.error(f"Failed to connect to Docker: {e}")
            self.client = None

    def ensure_images(self):
        if not self.client:
            logger.warning("Docker client not available, skipping image build check.")
            return
        
        for cid, cfg in CHALLENGE_MAP.items():
            img_name = cfg["image"]
            path = cfg["path"]
            try:
                self.client.images.get(img_name)
                logger.info(f"Image {img_name} already exists.")
            except docker.errors.ImageNotFound:
                logger.info(f"Image {img_name} not found. Building from {path}...")
                if os.path.exists(path):
                    try:
                        self.client.images.build(path=path, tag=img_name, rm=True)
                        logger.info(f"Successfully built image {img_name}")
                    except Exception as e:
                        logger.error(f"Error building image {img_name}: {e}")
                else:
                    logger.error(f"Build path {path} does not exist inside container.")

    def start_lab(self, db: Session, user_id: int, challenge_id: int) -> ChallengeInstance:
        if not self.client:
            raise Exception("Docker daemon is not reachable.")

        # Ensure image is ready
        cfg = CHALLENGE_MAP.get(challenge_id)
        if not cfg:
            raise Exception(f"No configuration for challenge ID {challenge_id}")

        img_name = cfg["image"]
        try:
            self.client.images.get(img_name)
        except docker.errors.ImageNotFound:
            self.ensure_images()

        # Enforce maximum 1 active environment per user across all challenges
        active_instances = db.query(ChallengeInstance).filter(
            ChallengeInstance.user_id == user_id,
            ChallengeInstance.status.in_(["Pending", "Running"])
        ).all()

        for inst in active_instances:
            logger.info(f"Terminating older active instance {inst.instance_name} for user {user_id}")
            self.terminate_lab(db, inst.id)

        # Create instance entry in DB
        instance_name = f"ctf-instance-{user_id}-{challenge_id}"
        session_id = os.urandom(16).hex()
        
        # Challenge details for duration/points
        challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
        duration_minutes = 60 # Default to 60m lab duration
        if challenge and challenge.estimated_time:
            try:
                # e.g., "20m" -> 20, "1h" -> 60
                est = challenge.estimated_time.lower()
                if "h" in est:
                    duration_minutes = int(est.replace("h", "").strip()) * 60
                elif "m" in est:
                    duration_minutes = int(est.replace("m", "").strip())
            except Exception:
                pass

        expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=duration_minutes)

        db_instance = ChallengeInstance(
            user_id=user_id,
            challenge_id=challenge_id,
            container_id="",
            instance_name=instance_name,
            session_id=session_id,
            status="Pending",
            port=7681, # ttyd default internal port
            resource_profile="RAM=512MB, CPU=0.5, PIDs=100",
            created_at=datetime.datetime.utcnow(),
            expires_at=expires_at
        )
        db.add(db_instance)
        db.commit()
        db.refresh(db_instance)

        try:
            # Clean up pre-existing container with same name if docker daemon has it
            try:
                old_container = self.client.containers.get(instance_name)
                logger.info(f"Removing pre-existing container {instance_name}")
                old_container.remove(force=True)
            except docker.errors.NotFound:
                pass

            # Create container
            container = self.client.containers.run(
                image=img_name,
                name=instance_name,
                detach=True,
                restart_policy={"Name": "no"},
                mem_limit="512m",
                nano_cpus=500000000, # 0.5 CPU
                pids_limit=100,
                network=NETWORK_NAME,
                labels={
                    "ctf-platform": "true",
                    "user-id": str(user_id),
                    "challenge-id": str(challenge_id)
                }
            )

            # Update DB instance
            db_instance.container_id = container.id
            db_instance.status = "Running"
            db.commit()
            db.refresh(db_instance)

            # Log audit action
            audit_log = AuditLog(
                user_id=user_id,
                action="START_LAB",
                details=f"Started container for challenge '{challenge.title if challenge else challenge_id}' (name: {instance_name})"
            )
            db.add(audit_log)
            db.commit()

            logger.info(f"Successfully started container {instance_name}")
            return db_instance

        except Exception as e:
            logger.error(f"Error starting container {instance_name}: {e}")
            db_instance.status = "Terminated"
            db_instance.terminated_at = datetime.datetime.utcnow()
            db.commit()
            raise e

    def terminate_lab(self, db: Session, instance_id: int):
        instance = db.query(ChallengeInstance).filter(ChallengeInstance.id == instance_id).first()
        if not instance or instance.status in ["Completed", "Expired", "Terminated"]:
            return

        if self.client and instance.container_id:
            try:
                container = self.client.containers.get(instance.container_id)
                logger.info(f"Stopping container {instance.instance_name}")
                container.stop(timeout=5)
                container.remove(force=True)
            except docker.errors.NotFound:
                # Maybe it was already deleted manually
                pass
            except Exception as e:
                logger.error(f"Failed to cleanly delete container {instance.instance_name}: {e}")

        # Update DB status
        instance.status = "Terminated"
        instance.terminated_at = datetime.datetime.utcnow()
        db.commit()

        # Log audit action
        audit_log = AuditLog(
            user_id=instance.user_id,
            action="STOP_LAB",
            details=f"Terminated container for challenge {instance.challenge_id} (name: {instance.instance_name})"
        )
        db.add(audit_log)
        db.commit()
