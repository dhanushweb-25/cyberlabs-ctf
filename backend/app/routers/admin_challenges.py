from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import logging
import os
import json
import uuid
import httpx
import threading
from ..database import get_db
from .. import models, auth
from ..services.audit import log_action

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/challenges", tags=["admin-challenges"])

class ChallengeCreate(BaseModel):
    title: str
    description: str
    difficulty: str  # Easy, Medium, Hard
    points: int
    category: str
    estimated_time: str
    provider_type: str  # docker, gcp
    flag_value: str
    docker_image: Optional[str] = None
    docker_build_path: Optional[str] = None
    victim_image: Optional[str] = None
    victim_build_path: Optional[str] = None
    hint: Optional[str] = None

class ChallengeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = None
    points: Optional[int] = None
    category: Optional[str] = None
    estimated_time: Optional[str] = None
    provider_type: Optional[str] = None
    flag_value: Optional[str] = None
    docker_image: Optional[str] = None
    docker_build_path: Optional[str] = None
    victim_image: Optional[str] = None
    victim_build_path: Optional[str] = None
    hint: Optional[str] = None

def check_admin(current_user: models.User = Depends(auth.get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required"
        )
    return current_user

@router.post("")
def create_challenge(
    req: ChallengeCreate,
    current_user: models.User = Depends(check_admin),
    db: Session = Depends(get_db)
):
    try:
        # Create Challenge
        db_challenge = models.Challenge(
            title=req.title,
            description=req.description,
            difficulty=req.difficulty,
            points=req.points,
            category=req.category,
            estimated_time=req.estimated_time,
            provider_type=req.provider_type,
            docker_image=req.docker_image,
            docker_build_path=req.docker_build_path,
            victim_image=req.victim_image,
            victim_build_path=req.victim_build_path,
            hint=req.hint
        )
        db.add(db_challenge)
        db.commit()
        db.refresh(db_challenge)

        # Create associated Flag
        db_flag = models.Flag(
            challenge_id=db_challenge.id,
            flag_value=req.flag_value
        )
        db.add(db_flag)
        db.commit()

        log_action(db, current_user.id, "Create Challenge", f"Created challenge '{req.title}' (ID: {db_challenge.id})")
        return {"message": "Challenge created successfully", "challenge_id": db_challenge.id}
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating challenge: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create challenge: {str(e)}")

@router.put("/{challenge_id}")
def update_challenge(
    challenge_id: int,
    req: ChallengeUpdate,
    current_user: models.User = Depends(check_admin),
    db: Session = Depends(get_db)
):
    db_challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not db_challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    try:
        # Update Challenge fields
        if req.title is not None:
            db_challenge.title = req.title
        if req.description is not None:
            db_challenge.description = req.description
        if req.difficulty is not None:
            db_challenge.difficulty = req.difficulty
        if req.points is not None:
            db_challenge.points = req.points
        if req.category is not None:
            db_challenge.category = req.category
        if req.estimated_time is not None:
            db_challenge.estimated_time = req.estimated_time
        if req.provider_type is not None:
            db_challenge.provider_type = req.provider_type
        if req.docker_image is not None:
            db_challenge.docker_image = req.docker_image
        if req.docker_build_path is not None:
            db_challenge.docker_build_path = req.docker_build_path
        if req.victim_image is not None:
            db_challenge.victim_image = req.victim_image
        if req.victim_build_path is not None:
            db_challenge.victim_build_path = req.victim_build_path
        if req.hint is not None:
            db_challenge.hint = req.hint

        # Update Flag value if provided
        if req.flag_value is not None:
            db_flag = db.query(models.Flag).filter(models.Flag.challenge_id == challenge_id).first()
            if db_flag:
                db_flag.flag_value = req.flag_value
            else:
                db_flag = models.Flag(challenge_id=challenge_id, flag_value=req.flag_value)
                db.add(db_flag)

        db.commit()
        log_action(db, current_user.id, "Update Challenge", f"Updated challenge '{db_challenge.title}' (ID: {challenge_id})")
        return {"message": "Challenge updated successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating challenge: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update challenge: {str(e)}")

@router.delete("/{challenge_id}")
def delete_challenge(
    challenge_id: int,
    current_user: models.User = Depends(check_admin),
    db: Session = Depends(get_db)
):
    db_challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not db_challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    try:
        title = db_challenge.title
        db.delete(db_challenge)
        db.commit()
        log_action(db, current_user.id, "Delete Challenge", f"Deleted challenge '{title}' (ID: {challenge_id})")
        return {"message": "Challenge deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting challenge: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete challenge: {str(e)}")


class AIGenerateRequest(BaseModel):
    prompt: str

def build_docker_image_async(path: str, tag: str):
    try:
        import docker
        client = docker.from_env()
        logger.info(f"Background thread starting docker build for {tag} at {path}")
        client.images.build(path=path, tag=tag, rm=True)
        logger.info(f"Background thread successfully finished docker build for {tag}")
    except Exception as e:
        logger.error(f"Background thread failed to build docker image {tag}: {e}")

@router.post("/generate-ai")
def generate_challenge_ai(
    req: AIGenerateRequest,
    current_user: models.User = Depends(check_admin),
    db: Session = Depends(get_db)
):
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GEMINI_API_KEY environment variable is not set on the server."
        )

    # Construct the instruction system prompt for Gemini
    system_instruction = (
        "You are an expert cybersecurity CTF lab developer. You design training challenges for Linux and Web exploitation.\n"
        "Your task is to generate fully functioning Docker container configurations and metadata based on the user's request.\n"
        "You MUST support both single-container challenges (terminal only) and dual-container challenges (Attack box terminal + Victim target).\n"
        "You MUST return a single JSON object matching this schema exactly:\n"
        "{\n"
        "  \"title\": \"Name of the challenge (string)\",\n"
        "  \"description\": \"A detailed, rich Markdown description outlining the scenario, target details (such as the victim container hostname like ctf-victim-{user_id}-{challenge_id}), and how to query it.\",\n"
        "  \"difficulty\": \"Easy\", \"Medium\", or \"Hard\",\n"
        "  \"category\": \"Web\", \"Linux\", \"Cryptography\", or \"Reverse Engineering\",\n"
        "  \"points\": 50, 100, 150, or 200 (integer),\n"
        "  \"estimated_time\": \"20m\", \"45m\", \"1h\", etc. (string),\n"
        "  \"flag_value\": \"flag{...} unique random key matching the topic (string)\",\n"
        "  \"hint\": \"A helpful hint for the player (string)\",\n"
        "  \"dockerfile\": \"Dockerfile string for the Attack box. Must inherit FROM ctf-kali-attack:latest. Sets up student shell. Exposes 7681. Runs ttyd bash.\",\n"
        "  \"files\": {\n"
        "     \"filename1\": \"content of the script or config file for the attack box (e.g. exploit.py)\"\n"
        "  },\n"
        "  \"victim_dockerfile\": \"Optional. If the challenge requires a separate vulnerable target machine, write its Dockerfile here (e.g. FROM ubuntu:22.04 or FROM python:3.11-slim, installing and setting up the vulnerable service).\",\n"
        "  \"victim_files\": {\n"
        "     \"filename1\": \"Optional. Content of the script or configuration file for the victim container (e.g. vulnerable_app.py)\"\n"
        "  }\n"
        "}\n"
        "Strict rules for your Dockerfiles:\n"
        "1. Do NOT run 'apt-get install' inside the Attack Dockerfile. All standard tools are pre-installed in ctf-kali-attack:latest! This keeps builds fast.\n"
        "2. For the Attack Dockerfile, ensure you create a 'student' user and run ttyd as student. CMD: CMD [\"ttyd\", \"-p\", \"7681\", \"-W\", \"-i\", \"0.0.0.0\", \"bash\"]\n"
        "3. If a victim container is requested, the player will access it over the network using its container hostname. Explain this clearly in the description!\n"
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": f"{system_instruction}\n\nUser Request: {req.prompt}"}
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    try:
        response = httpx.post(url, json=payload, timeout=45.0)
        if response.status_code != 200:
            raise Exception(f"Gemini API returned status {response.status_code}: {response.text}")
            
        data = response.json()
        text_content = data["candidates"][0]["content"]["parts"][0]["text"]
        result = json.loads(text_content.strip())
        
        # Validate result fields
        required_fields = ["title", "description", "difficulty", "category", "points", "estimated_time", "flag_value", "dockerfile"]
        for field in required_fields:
            if field not in result:
                raise Exception(f"Missing required field '{field}' in Gemini AI response: {text_content}")

        # Create unique folder and build path
        uuid_hex = uuid.uuid4().hex[:12]
        base_build_path = f"/challenges/ai-gen-{uuid_hex}"
        
        attack_image = f"ctf-challenge-ai-{uuid_hex}"
        attack_build_path = f"{base_build_path}/attack"
        
        # Create directories
        os.makedirs(attack_build_path, exist_ok=True)
        
        # Write Attack Dockerfile
        with open(os.path.join(attack_build_path, "Dockerfile"), "w") as f:
            f.write(result["dockerfile"])

        # Write Attack supporting files
        for filename, content in result.get("files", {}).items():
            file_filepath = os.path.join(attack_build_path, filename)
            os.makedirs(os.path.dirname(file_filepath), exist_ok=True)
            with open(file_filepath, "w") as f:
                f.write(content)

        # Trigger async build for Attack Box
        threading.Thread(target=build_docker_image_async, args=(attack_build_path, attack_image), daemon=True).start()

        # Handle Victim container if present
        victim_image = None
        victim_build_path = None
        
        if result.get("victim_dockerfile"):
            victim_image = f"ctf-victim-ai-{uuid_hex}"
            victim_build_path = f"{base_build_path}/victim"
            os.makedirs(victim_build_path, exist_ok=True)
            
            # Write Victim Dockerfile
            with open(os.path.join(victim_build_path, "Dockerfile"), "w") as f:
                f.write(result["victim_dockerfile"])
                
            # Write Victim supporting files
            for filename, content in result.get("victim_files", {}).items():
                file_filepath = os.path.join(victim_build_path, filename)
                os.makedirs(os.path.dirname(file_filepath), exist_ok=True)
                with open(file_filepath, "w") as f:
                    f.write(content)
                    
            # Trigger async build for Victim Box
            threading.Thread(target=build_docker_image_async, args=(victim_build_path, victim_image), daemon=True).start()

        # Insert challenge into the database
        db_challenge = models.Challenge(
            title=result["title"],
            description=result["description"],
            difficulty=result["difficulty"],
            points=int(result["points"]),
            category=result["category"],
            estimated_time=result["estimated_time"],
            provider_type="docker",
            docker_image=attack_image,
            docker_build_path=attack_build_path,
            victim_image=victim_image,
            victim_build_path=victim_build_path,
            hint=result.get("hint")
        )
        db.add(db_challenge)
        db.commit()
        db.refresh(db_challenge)

        # Insert associated Flag
        db_flag = models.Flag(
            challenge_id=db_challenge.id,
            flag_value=result["flag_value"]
        )
        db.add(db_flag)
        db.commit()

        log_action(db, current_user.id, "AI Generate Challenge", f"AI Generated challenge '{result['title']}' (ID: {db_challenge.id})")
        return {
            "message": "Challenge generated successfully",
            "challenge_id": db_challenge.id,
            "title": result["title"],
            "flag": result["flag_value"]
        }

    except Exception as e:
        logger.error(f"Error generating challenge via Gemini: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI Generation failed: {str(e)}"
        )
