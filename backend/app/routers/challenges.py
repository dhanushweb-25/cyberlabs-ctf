from fastapi import APIRouter, Depends, HTTPException, status, Header, Response, WebSocket, WebSocketDisconnect, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from jose import jwt, JWTError
import datetime
import asyncio
import logging
import websockets
import httpx
from ..database import get_db
from .. import schemas, crud, auth, models
from ..config import settings
from ..providers.manager import provider_manager
from ..services.audit import log_action

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/challenges", tags=["challenges"])


# Helper to get optional user from Authorization header
async def get_optional_user(
    authorization: Optional[str] = Header(None), 
    db: Session = Depends(get_db)
) -> Optional[models.User]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: int = payload.get("user_id")
        if user_id:
            return db.query(models.User).filter(models.User.id == user_id).first()
    except JWTError:
        return None
    return None

@router.get("", response_model=List[schemas.ChallengeResponse])
def list_challenges(
    current_user: Optional[models.User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    challenges = crud.get_challenges(db)
    result = []
    
    for challenge in challenges:
        is_solved = False
        if current_user:
            is_solved = crud.has_solved_challenge(db, current_user.id, challenge.id)
            
        result.append(schemas.ChallengeResponse(
            id=challenge.id,
            title=challenge.title,
            description=challenge.description,
            difficulty=challenge.difficulty,
            points=challenge.points,
            category=challenge.category,
            estimated_time=challenge.estimated_time,
            provider_type=challenge.provider_type,
            created_at=challenge.created_at,
            is_solved=is_solved
        ))
    return result

@router.get("/active", response_model=Optional[schemas.ChallengeInstanceResponse])
def get_active_instance(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    instance = db.query(models.ChallengeInstance).filter(
        models.ChallengeInstance.user_id == current_user.id,
        models.ChallengeInstance.status == "Running"
    ).first()
    
    if not instance:
        return None
        
    # Check if expired
    now = datetime.datetime.utcnow()
    expires_at_naive = instance.expires_at.replace(tzinfo=None) if instance.expires_at.tzinfo else instance.expires_at
    if expires_at_naive <= now:
        provider_manager.terminate_instance(db, instance.id)
        instance.status = "Expired"
        db.commit()
        return None
        
    remaining = int((expires_at_naive - now).total_seconds())
    return schemas.ChallengeInstanceResponse(
        id=instance.id,
        user_id=instance.user_id,
        challenge_id=instance.challenge_id,
        instance_name=instance.instance_name,
        status=instance.status,
        port=instance.port,
        created_at=instance.created_at,
        expires_at=instance.expires_at,
        active_seconds_remaining=max(0, remaining)
      )

@router.get("/{id}", response_model=schemas.ChallengeResponse)
def get_challenge_by_id(
    id: int, 
    current_user: Optional[models.User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    challenge = crud.get_challenge(db, id)
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found"
        )
        
    is_solved = False
    if current_user:
        is_solved = crud.has_solved_challenge(db, current_user.id, challenge.id)
        
    return schemas.ChallengeResponse(
        id=challenge.id,
        title=challenge.title,
        description=challenge.description,
        difficulty=challenge.difficulty,
        points=challenge.points,
        category=challenge.category,
        estimated_time=challenge.estimated_time,
        provider_type=challenge.provider_type,
        created_at=challenge.created_at,
        is_solved=is_solved
    )

# Request schema for start challenge
class StartChallengeRequest(BaseModel):
    challenge_id: int

@router.post("/start", response_model=schemas.ChallengeInstanceResponse)
def start_challenge(
    req: StartChallengeRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    challenge = crud.get_challenge(db, req.challenge_id)
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found"
        )
        
    # Enforce platform capacity: maximum 3 concurrent active labs (excluding user's own active lab that will be terminated)
    other_active_labs = db.query(models.ChallengeInstance).filter(
        models.ChallengeInstance.status == "Running",
        models.ChallengeInstance.user_id != current_user.id
    ).count()
    
    if other_active_labs >= 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Platform lab capacity exceeded (Max 3 concurrent labs). Please try again later."
        )

    try:
        instance = provider_manager.start_instance(db, current_user.id, challenge.id)
        expires_at_naive = instance.expires_at.replace(tzinfo=None) if instance.expires_at.tzinfo else instance.expires_at
        remaining = int((expires_at_naive - datetime.datetime.utcnow()).total_seconds())
        
        return schemas.ChallengeInstanceResponse(
            id=instance.id,
            user_id=instance.user_id,
            challenge_id=instance.challenge_id,
            instance_name=instance.instance_name,
            status=instance.status,
            port=instance.port,
            created_at=instance.created_at,
            expires_at=instance.expires_at,
            active_seconds_remaining=max(0, remaining)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start challenge instance: {str(e)}"
        )


@router.post("/terminate")
def terminate_lab(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    instance = db.query(models.ChallengeInstance).filter(
        models.ChallengeInstance.user_id == current_user.id,
        models.ChallengeInstance.status == "Running"
    ).first()
    
    if not instance:
        raise HTTPException(status_code=404, detail="No active lab session found")
        
    provider_manager.terminate_instance(db, instance.id)
    return {"message": "Lab environment terminated successfully"}

# Submit Flag endpoint
class SubmitFlagRequest(BaseModel):
    challenge_id: int
    submitted_flag: str

@router.post("/submit", response_model=schemas.FlagSubmitResult)
def submit_flag(
    req: SubmitFlagRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    challenge = crud.get_challenge(db, req.challenge_id)
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found"
        )
        
    # Check if user already solved it
    already_solved = crud.has_solved_challenge(db, current_user.id, challenge.id)
    
    # Fetch correct flag
    db_flag = crud.get_flag_by_challenge_id(db, challenge.id)
    if not db_flag:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Flag not configured for this challenge"
        )
        
    is_correct = req.submitted_flag.strip() == db_flag.flag_value.strip()
    status_str = "Correct" if is_correct else "Incorrect"
    
    # Save submission
    crud.create_submission(db, current_user.id, challenge.id, req.submitted_flag, status_str)
    
    # Track progress / update
    progress = db.query(models.ChallengeProgress).filter(
        models.ChallengeProgress.user_id == current_user.id,
        models.ChallengeProgress.challenge_id == challenge.id
    ).first()
    
    if not progress:
        progress = models.ChallengeProgress(
            user_id=current_user.id,
            challenge_id=challenge.id,
            completed=is_correct,
            attempts_count=1,
            completed_at=datetime.datetime.utcnow() if is_correct else None
        )
        db.add(progress)
    else:
        progress.attempts_count += 1
        if is_correct and not progress.completed:
            progress.completed = True
            progress.completed_at = datetime.datetime.utcnow()
    db.commit()
    
    # Terminate active lab if correct and not already solved
    if is_correct and not already_solved:
        active_inst = db.query(models.ChallengeInstance).filter(
            models.ChallengeInstance.user_id == current_user.id,
            models.ChallengeInstance.challenge_id == challenge.id,
            models.ChallengeInstance.status == "Running"
        ).first()
        if active_inst:
            provider_manager.terminate_instance(db, active_inst.id)
            active_inst.status = "Completed"
            db.commit()

    points_earned = 0
    new_points = current_user.points
    
    if is_correct:
        if not already_solved:
            points_earned = challenge.points
            updated_user = crud.update_user_points(db, current_user.id, points_earned)
            new_points = updated_user.points
            message = f"Congratulations! You solved '{challenge.title}' and earned {points_earned} points!"
        else:
            message = f"Correct flag, but you have already completed this challenge."
    else:
        message = "Incorrect flag. Review the objective and try again."
        
    # Log submission audit
    log_action(
        db, 
        current_user.id, 
        "SUBMIT_FLAG", 
        f"Submitted flag for challenge '{challenge.title}'. Correct: {is_correct}. Flag: '{req.submitted_flag}'"
    )
        
    return schemas.FlagSubmitResult(
        correct=is_correct,
        message=message,
        points_earned=points_earned,
        new_total_points=new_points
    )

# HTTP asset proxy
@router.get("/terminal/{instance_name}/{path:path}")
async def terminal_http_proxy(
    instance_name: str,
    path: str,
    request: Request,
    db: Session = Depends(get_db)
):
    # 1. Resolve token from Query Param, Authorization Header, or Cookies
    token = request.query_params.get("token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    cookie_key = f"terminal_token_{instance_name}"
    if not token:
        token = request.cookies.get(cookie_key)
        
    if not token:
        raise HTTPException(status_code=401, detail="Authentication token required for terminal access")
        
    # 2. Validate token
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: int = payload.get("user_id")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    # 3. Verify instance belongs to user and is running
    instance = db.query(models.ChallengeInstance).filter(
        models.ChallengeInstance.instance_name == instance_name,
        models.ChallengeInstance.user_id == user_id,
        models.ChallengeInstance.status == "Running"
    ).first()
    
    if not instance:
        raise HTTPException(status_code=403, detail="Terminal instance not active or unauthorized")

    # 4. Proxy the HTTP request
    target_path = f"/{path}" if path else "/"
    
    challenge = db.query(models.Challenge).filter(models.Challenge.id == instance.challenge_id).first()
    is_gcp = challenge and challenge.provider_type == "gcp"
    is_simulated = instance.container_id is not None or instance.public_ip == "127.0.0.1"
    
    if is_gcp and not is_simulated:
        host = instance.public_ip or "127.0.0.1"
    else:
        host = instance.private_ip or instance_name
        if not host:
            host = instance_name
            
    target_url = f"http://{host}:7681{target_path}"

    async with httpx.AsyncClient() as client:
        try:
            r = await client.get(target_url, timeout=5.0)
            headers = {k: v for k, v in r.headers.items() if k.lower() not in ["content-encoding", "transfer-encoding", "content-length"]}
            
            response = Response(content=r.content, status_code=r.status_code, headers=headers)
            
            # 5. Set cookie to authenticate subsequent sub-resource requests
            # Max age of 1 hour, paths restricted to terminal endpoint
            cookie_path = f"/api/challenges/terminal/{instance_name}"
            response.set_cookie(
                key=cookie_key,
                value=token,
                max_age=3600,
                path=cookie_path,
                httponly=True,
                samesite="lax"
            )
            return response
            
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Failed to connect to terminal service: {e}")

# WebSocket proxy
@router.websocket("/terminal/{instance_name}/ws")
async def websocket_terminal_proxy(
    websocket: WebSocket,
    instance_name: str,
    token: Optional[str] = None,
    db: Session = Depends(get_db)
):
    # 1. Parse requested subprotocols (e.g. ttyd expects 'tty' subprotocol)
    protocols = websocket.headers.get("sec-websocket-protocol")
    subprotocols_list = [p.strip() for p in protocols.split(",")] if protocols else []
    
    if subprotocols_list:
        await websocket.accept(subprotocol=subprotocols_list[0])
    else:
        await websocket.accept()
    
    if not token:
        token = websocket.query_params.get("token")
        
    if not token:
        cookie_key = f"terminal_token_{instance_name}"
        token = websocket.cookies.get(cookie_key)
        
    if not token:
        logger.warning(f"WebSocket auth failed: token not found for instance {instance_name}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing token")
        return
        
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: int = payload.get("user_id")
    except JWTError as e:
        logger.warning(f"WebSocket auth failed: JWT decode failed for instance {instance_name}: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
        return

    # Check instance
    instance = db.query(models.ChallengeInstance).filter(
        models.ChallengeInstance.instance_name == instance_name,
        models.ChallengeInstance.user_id == user_id,
        models.ChallengeInstance.status == "Running"
    ).first()

    if not instance:
        logger.warning(f"WebSocket auth failed: Instance '{instance_name}' for user {user_id} not running in DB")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Instance not active or unauthorized")
        return

    challenge = db.query(models.Challenge).filter(models.Challenge.id == instance.challenge_id).first()
    is_gcp = challenge and challenge.provider_type == "gcp"
    is_simulated = instance.container_id is not None or instance.public_ip == "127.0.0.1"
    
    if is_gcp and not is_simulated:
        host = instance.public_ip or "127.0.0.1"
    else:
        host = instance.private_ip or instance_name
        if not host:
            host = instance_name

    target_url = f"ws://{host}:7681/ws"
    logger.info(f"Establishing WebSocket tunnel to container terminal at {target_url}...")
    
    try:
        async with websockets.connect(target_url, subprotocols=subprotocols_list) as target_ws:
            logger.info("Successfully connected to container terminal WebSocket.")
            
            async def forward_to_client():
                try:
                    async for message in target_ws:
                        if isinstance(message, str):
                            await websocket.send_text(message)
                        else:
                            await websocket.send_bytes(message)
                except Exception as e:
                    logger.error(f"Error in forward_to_client loop: {e}")

            async def forward_to_target():
                try:
                    while True:
                        data = await websocket.receive()
                        if "text" in data:
                            await target_ws.send(data["text"])
                        elif "bytes" in data:
                            await target_ws.send(data["bytes"])
                        elif data.get("type") == "websocket.disconnect":
                            logger.info("Client browser WebSocket disconnected normally.")
                            break
                except Exception as e:
                    logger.error(f"Error in forward_to_target loop: {e}")

            task1 = asyncio.create_task(forward_to_client())
            task2 = asyncio.create_task(forward_to_target())
            
            done, pending = await asyncio.wait(
                [task1, task2],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            for task in pending:
                task.cancel()
            
            logger.info("WebSocket tunnel closed.")
            
    except Exception as e:
        logger.error(f"WebSocket terminal proxy connection to {target_url} failed: {e}")
        await websocket.close(code=1011, reason="Terminal service disconnected")

