import threading
import time
import datetime
import logging
from ..database import SessionLocal
from ..models import ChallengeInstance
from ..providers.manager import provider_manager

logger = logging.getLogger(__name__)

class ExpiryScheduler:
    def __init__(self):
        self._stop_event = threading.Event()
        self._thread = None

    def start(self):
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        logger.info("Expiry Scheduler background thread started.")

    def stop(self):
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5)
            logger.info("Expiry Scheduler background thread stopped.")

    def _run_loop(self):
        while not self._stop_event.is_set():
            try:
                db = SessionLocal()
                try:
                    now = datetime.datetime.utcnow()
                    expired_instances = db.query(ChallengeInstance).filter(
                        ChallengeInstance.status.in_(["Pending", "Running"]),
                        ChallengeInstance.expires_at <= now
                    ).all()

                    for inst in expired_instances:
                        logger.info(f"Instance {inst.instance_name} expired. Cleaning up...")
                        # Terminate the lab instance
                        provider_manager.terminate_instance(db, inst.id)
                        # Set status to Expired specifically
                        inst.status = "Expired"
                        db.commit()
                except Exception as e:
                    logger.error(f"Error checking expired instances: {e}")
                finally:
                    db.close()
            except Exception as e:
                logger.error(f"Database session setup error in scheduler: {e}")
            
            # Wait for 15 seconds
            self._stop_event.wait(15)

scheduler = ExpiryScheduler()
