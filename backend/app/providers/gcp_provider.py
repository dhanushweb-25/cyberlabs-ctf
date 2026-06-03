import os
import logging
import datetime
import time
from sqlalchemy.orm import Session
from ..models import ChallengeInstance, Challenge, AuditLog
from .base import BaseProvider
import docker

logger = logging.getLogger(__name__)

try:
    from google.cloud import compute_v1
    GCP_AVAILABLE = True
except ImportError:
    GCP_AVAILABLE = False

class GCPProvider(BaseProvider):
    def __init__(self):
        self.simulation_mode = True
        self.project_id = os.environ.get("GCP_PROJECT_ID", "mock-ctf-project")
        self.zone = os.environ.get("GCP_ZONE", "us-central1-a")
        
        # Determine if we can run GCP code
        if GCP_AVAILABLE and os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
            try:
                self.client = compute_v1.InstancesClient()
                self.simulation_mode = False
                logger.info("GCP Compute client initialized successfully. GCP provider is active.")
            except Exception as e:
                logger.warning(f"Failed to initialize GCP client: {e}. Falling back to Simulation Mode.")
        else:
            logger.info("GCP credentials or libraries not found. GCP provider running in Simulation Mode (Docker fallback).")

        # Set up Docker client for simulation fallback
        self.docker_client = None
        if self.simulation_mode:
            try:
                self.docker_client = docker.from_env()
                logger.info("Connected to Docker for GCP Simulation Mode fallback.")
                self.ensure_kali_image()
            except Exception as e:
                logger.warning(f"Could not connect to Docker for GCP Simulation fallback: {e}")

    def ensure_kali_image(self):
        if not self.docker_client:
            return
        img_name = "ctf-kali-attack"
        path = "/challenges/kali-attack"
        try:
            self.docker_client.images.get(img_name)
            logger.info(f"Kali attack image {img_name} already exists.")
        except docker.errors.ImageNotFound:
            logger.info(f"Kali attack image {img_name} not found. Building from {path}...")
            if os.path.exists(path):
                try:
                    self.docker_client.images.build(path=path, tag=img_name, rm=True)
                    logger.info(f"Successfully built Kali attack image {img_name}")
                except Exception as e:
                    logger.error(f"Error building Kali attack image {img_name}: {e}")
            else:
                logger.error(f"Build path {path} does not exist inside backend container.")

    def get_startup_script(self, challenge_id: int, is_attack: bool = True) -> str:
        if is_attack:
            script = """#!/bin/bash
# Wait for apt lock
while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 ; do
    sleep 1
done

# Install ttyd and attack tools (simulating Kali attack VM)
apt-get update
apt-get install -y ttyd nmap curl netcat-openbsd hydra

# Create systemd service for ttyd
cat <<'EOF' > /etc/systemd/system/ttyd.service
[Unit]
Description=Web Terminal ttyd
After=network.target

[Service]
ExecStart=/usr/bin/ttyd -p 7681 -W su - ubuntu
Restart=always
User=root
WorkingDirectory=/home/ubuntu
Environment=HOME=/home/ubuntu

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ttyd
systemctl start ttyd
"""
            return script
        else:
            # Victim setup
            flags = {
                6: "CTF{ad_compromised_domain_admin}",
                7: "CTF{soc_log_analysis_complete}",
                8: "CTF{cloud_metadata_leaked_99}",
                9: "CTF{k8s_pod_escape_success}"
            }
            flag = flags.get(challenge_id, "CTF{default_gcp_flag}")
            script = f"""#!/bin/bash
# Wait for apt lock
while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 ; do
    sleep 1
done

# Setup victim target environment
echo "{flag}" > /root/flag.txt
echo "Victim target machine is online." > /var/www/html/index.html || true
"""
            return script

    def start_lab(self, db: Session, user_id: int, challenge_id: int) -> ChallengeInstance:
        # Enforce maximum 1 active environment per user across all challenges
        active_instances = db.query(ChallengeInstance).filter(
            ChallengeInstance.user_id == user_id,
            ChallengeInstance.status.in_(["Pending", "Running"])
        ).all()

        for inst in active_instances:
            logger.info(f"Terminating older active instance {inst.instance_name} for user {user_id}")
            self.terminate_lab(db, inst.id)

        instance_name = f"ctf-gcp-{user_id}-{challenge_id}"
        session_id = os.urandom(16).hex()
        
        challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
        duration_minutes = 90  # Default to 90m for GCP labs
        if challenge and challenge.estimated_time:
            try:
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
            instance_name=instance_name,
            session_id=session_id,
            status="Pending",
            port=7681,  # ttyd internal port
            resource_profile="e2-micro (GCP)",
            created_at=datetime.datetime.utcnow(),
            expires_at=expires_at,
            zone=self.zone
        )
        db.add(db_instance)
        db.commit()
        db.refresh(db_instance)

        startup_script_attack = self.get_startup_script(challenge_id, is_attack=True)
        startup_script_victim = self.get_startup_script(challenge_id, is_attack=False)

        if self.simulation_mode:
            logger.info(f"Starting simulated GCP environment (Attack + Victim) {instance_name} for user {user_id}")
            if self.docker_client:
                # Cleanup existing attack container
                try:
                    old_attack = self.docker_client.containers.get(instance_name)
                    old_attack.remove(force=True)
                except Exception:
                    pass
                
                # Cleanup existing victim container
                victim_name = f"ctf-gcp-victim-{user_id}-{challenge_id}"
                try:
                    old_victim = self.docker_client.containers.get(victim_name)
                    old_victim.remove(force=True)
                except Exception:
                    pass

                # Run Attack Container (Simulated Kali terminal)
                container = self.docker_client.containers.run(
                    image="ctf-kali-attack",
                    name=instance_name,
                    detach=True,
                    network="ctf_network",
                    labels={
                        "ctf-platform": "true",
                        "gcp-simulation": "true",
                        "role": "attack",
                        "user-id": str(user_id)
                    }
                )

                # Run Victim Container (representing target target)
                flags = {
                    6: "CTF{ad_compromised_domain_admin}",
                    7: "CTF{soc_log_analysis_complete}",
                    8: "CTF{cloud_metadata_leaked_99}",
                    9: "CTF{k8s_pod_escape_success}"
                }
                flag_val = flags.get(challenge_id, "CTF{default_gcp_flag}")

                # Build mock service runner script
                ports_and_banners = {
                    6: [(80, "HTTP/1.1 200 OK\\r\\nContent-Type: text/html\\r\\n\\r\\n<h1>Active Directory Domain Controller</h1>"), 
                        (389, "LDAP Directory Service"), 
                        (445, "Microsoft-DS SMB Service")],
                    7: [(80, "HTTP/1.1 200 OK\\r\\nContent-Type: text/html\\r\\n\\r\\n<h1>SOC Logs Panel</h1>"), 
                        (22, "SSH-2.0-OpenSSH_9.6p1")],
                    8: [(80, "HTTP/1.1 200 OK\\r\\nContent-Type: text/html\\r\\n\\r\\n<h1>Cloud Console Portal</h1>"), 
                        (8080, "HTTP/1.1 200 OK\\r\\nContent-Type: text/plain\\r\\n\\r\\nInstance Metadata Service: http://169.254.169.254/latest/meta-data/")],
                    9: [(80, "HTTP/1.1 200 OK\\r\\nContent-Type: text/html\\r\\n\\r\\n<h1>Kubernetes Admin Console</h1>"), 
                        (6443, "HTTP/1.1 401 Unauthorized\\r\\n\\r\\nKubernetes API Server")]
                }

                target_services = ports_and_banners.get(challenge_id, [(80, "HTTP/1.1 200 OK\\r\\n\\r\\nDefault Service")])
                
                thread_spawns = []
                for p, b in target_services:
                    thread_spawns.append(f"threading.Thread(target=listen, args=({p}, '{b}'), daemon=True).start()")
                
                python_script = f"""
import socket, threading, time

def listen(port, response):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        s.bind(('0.0.0.0', port))
        s.listen(5)
        while True:
            conn, addr = s.accept()
            try:
                conn.settimeout(1.0)
                conn.recv(1024)
            except Exception:
                pass
            conn.sendall(response.encode())
            conn.close()
    except Exception as e:
        pass

{chr(10).join(thread_spawns)}

while True:
    time.sleep(3600)
"""
                
                victim_container = self.docker_client.containers.run(
                    image="python:3.11-slim",
                    name=victim_name,
                    detach=True,
                    network="ctf_network",
                    command=["python", "-u", "-c", python_script],
                    labels={
                        "ctf-platform": "true",
                        "gcp-simulation": "true",
                        "role": "victim",
                        "user-id": str(user_id)
                    }
                )
                
                # Write flag directly inside victim filesystem
                try:
                    victim_container.exec_run("mkdir -p /root")
                    victim_container.exec_run(f"sh -c \"echo '{flag_val}' > /root/flag.txt\"")
                except Exception as e:
                    logger.warning(f"Failed to seed flag into simulated victim container: {e}")

                db_instance.container_id = container.id
                db_instance.public_ip = "127.0.0.1"
                db_instance.private_ip = instance_name # FastAPI container network DNS name
            else:
                # No docker client, purely mock IPs
                db_instance.public_ip = "34.120.55.10"
                db_instance.private_ip = "10.128.0.2"
            
            db_instance.status = "Running"
            db.commit()
            db.refresh(db_instance)
            
            # Audit log
            audit_log = AuditLog(
                user_id=user_id,
                action="START_LAB",
                details=f"Started simulated GCP VM environment (Attack Terminal: {instance_name}, Target Victim: ctf-gcp-victim-{user_id}-{challenge_id})"
            )
            db.add(audit_log)
            db.commit()
            return db_instance

        # Real GCP provisioning:
        try:
            victim_name = f"ctf-gcp-victim-{user_id}-{challenge_id}"
            logger.info(f"Provisioning real GCP instances (Attack VM: {instance_name}, Victim VM: {victim_name}) in project {self.project_id}, zone {self.zone}")
            
            def wait_for_op(op):
                start_time = time.time()
                op_client = compute_v1.ZoneOperationsClient()
                while op.status != compute_v1.Operation.Status.DONE:
                    if time.time() - start_time > 120:
                        raise Exception("Timeout waiting for GCP VM instance operation")
                    time.sleep(2)
                    op = op_client.get(
                        project=self.project_id,
                        zone=self.zone,
                        operation=op.name
                    )
                if op.error:
                    raise Exception(f"GCP Operation Error: {op.error}")

            # Construct Attack Instance
            instance = compute_v1.Instance()
            instance.name = instance_name
            instance.machine_type = f"zones/{self.zone}/machineTypes/e2-micro"
            
            disk = compute_v1.AttachedDisk()
            disk.boot = True
            disk.auto_delete = True
            
            initialize_params = compute_v1.AttachedDiskInitializeParams()
            initialize_params.source_image = "projects/ubuntu-os-cloud/global/images/family/ubuntu-2404-lts-amd64"
            initialize_params.disk_size_gb = 10
            disk.initialize_params = initialize_params
            
            instance.disks = [disk]
            
            # Network interface for Attack machine
            network_interface = compute_v1.NetworkInterface()
            network_interface.network = "global/networks/default"
            
            access_config = compute_v1.AccessConfig()
            access_config.name = "External NAT"
            access_config.type_ = "ONE_TO_ONE_NAT"
            network_interface.access_configs = [access_config]
            instance.network_interfaces = [network_interface]
            
            # Metadata containing the startup script for Attack machine
            metadata = compute_v1.Metadata()
            metadata.items = [
                compute_v1.Items(key="startup-script", value=startup_script_attack)
            ]
            instance.metadata = metadata
            
            tags = compute_v1.Tags()
            tags.items = ["ctf-lab-node"]
            instance.tags = tags
            
            # Construct Victim Instance
            victim_instance = compute_v1.Instance()
            victim_instance.name = victim_name
            victim_instance.machine_type = f"zones/{self.zone}/machineTypes/e2-micro"
            
            disk_victim = compute_v1.AttachedDisk()
            disk_victim.boot = True
            disk_victim.auto_delete = True
            initialize_params_victim = compute_v1.AttachedDiskInitializeParams()
            initialize_params_victim.source_image = "projects/ubuntu-os-cloud/global/images/family/ubuntu-2404-lts-amd64"
            initialize_params_victim.disk_size_gb = 10
            disk_victim.initialize_params = initialize_params_victim
            victim_instance.disks = [disk_victim]
            
            network_interface_victim = compute_v1.NetworkInterface()
            network_interface_victim.network = "global/networks/default"
            victim_instance.network_interfaces = [network_interface_victim]
            
            # Metadata containing the startup script for Victim machine
            metadata_victim = compute_v1.Metadata()
            metadata_victim.items = [
                compute_v1.Items(key="startup-script", value=startup_script_victim)
            ]
            victim_instance.metadata = metadata_victim
            victim_instance.tags = compute_v1.Tags(items=["ctf-lab-node"])

            # Call Compute client to insert instances
            logger.info(f"Inserting attack VM {instance_name}...")
            operation_attack = self.client.insert(
                project=self.project_id,
                zone=self.zone,
                instance_resource=instance
            )
            
            logger.info(f"Inserting victim VM {victim_name}...")
            operation_victim = self.client.insert(
                project=self.project_id,
                zone=self.zone,
                instance_resource=victim_instance
            )
            
            logger.info(f"Waiting for attack instance {instance_name} creation operation...")
            wait_for_op(operation_attack)
            
            logger.info(f"Waiting for victim instance {victim_name} creation operation...")
            wait_for_op(operation_victim)

            # Get the created instance to fetch its IP addresses
            gcp_inst = self.client.get(
                project=self.project_id,
                zone=self.zone,
                instance=instance_name
            )
            
            # Extract IPs
            private_ip = gcp_inst.network_interfaces[0].network_ip
            public_ip = None
            if gcp_inst.network_interfaces[0].access_configs:
                public_ip = gcp_inst.network_interfaces[0].access_configs[0].nat_i_p
                
            db_instance.gcp_instance_id = str(gcp_inst.id)
            db_instance.public_ip = public_ip
            db_instance.private_ip = private_ip
            db_instance.status = "Running"
            db.commit()
            db.refresh(db_instance)
            
            # Log audit
            audit_log = AuditLog(
                user_id=user_id,
                action="START_LAB",
                details=f"Successfully started GCP VMs for challenge '{challenge.title if challenge else challenge_id}' (Attack VM: {instance_name}, Victim VM: {victim_name})"
            )
            db.add(audit_log)
            db.commit()
            
            logger.info(f"GCP VM {instance_name} started. Public IP: {public_ip}, Private IP: {private_ip}")
            return db_instance
            
        except Exception as e:
            logger.error(f"Error provisioning real GCP VM {instance_name}: {e}")
            db_instance.status = "Terminated"
            db_instance.terminated_at = datetime.datetime.utcnow()
            db.commit()
            raise e

    def terminate_lab(self, db: Session, instance_id: int):
        instance = db.query(ChallengeInstance).filter(ChallengeInstance.id == instance_id).first()
        if not instance or instance.status in ["Completed", "Expired", "Terminated"]:
            return

        if self.simulation_mode:
            logger.info(f"Terminating simulated GCP instance environment: {instance.instance_name}")
            # Remove attack terminal container
            if self.docker_client and instance.container_id:
                try:
                    container = self.docker_client.containers.get(instance.container_id)
                    container.stop(timeout=5)
                    container.remove(force=True)
                except Exception as e:
                    logger.warning(f"Could not stop simulated docker attack container: {e}")
            # Remove victim target container
            victim_name = f"ctf-gcp-victim-{instance.user_id}-{instance.challenge_id}"
            if self.docker_client:
                try:
                    v_container = self.docker_client.containers.get(victim_name)
                    v_container.stop(timeout=5)
                    v_container.remove(force=True)
                except Exception as e:
                    logger.warning(f"Could not stop simulated docker victim container: {e}")
        else:
            try:
                logger.info(f"Terminating real GCP VM instances for: {instance.instance_name}")
                # Terminate attack VM
                self.client.delete(
                    project=self.project_id,
                    zone=self.zone,
                    instance=instance.instance_name
                )
                # Terminate victim VM
                victim_name = f"ctf-gcp-victim-{instance.user_id}-{instance.challenge_id}"
                self.client.delete(
                    project=self.project_id,
                    zone=self.zone,
                    instance=victim_name
                )
            except Exception as e:
                logger.error(f"Failed to delete GCP VM instances {instance.instance_name}: {e}")

        # Update DB status
        instance.status = "Terminated"
        instance.terminated_at = datetime.datetime.utcnow()
        db.commit()

        # Log audit action
        audit_log = AuditLog(
            user_id=instance.user_id,
            action="STOP_LAB",
            details=f"Terminated GCP VM for challenge {instance.challenge_id} (name: {instance.instance_name})"
        )
        db.add(audit_log)
        db.commit()
