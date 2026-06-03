from sqlalchemy.orm import Session
from sqlalchemy import text
from .database import SessionLocal
from .models import User, Challenge, Flag, Submission
from .auth import get_password_hash
from datetime import datetime, timedelta

def seed_db():
    db = SessionLocal()
    try:
        # 0. Migrate table schema dynamically to support hints
        db.execute(text("ALTER TABLE challenges ADD COLUMN IF NOT EXISTS hint TEXT;"))
        db.commit()

        # 1. Add Challenges
        challenges_data = [
            {
                "id": 1,
                "title": "Linux Navigation",
                "difficulty": "Easy",
                "points": 50,
                "category": "Linux",
                "estimated_time": "20m",
                "provider_type": "docker",
                "description": "Find the hidden flag file in the directory structure. In this lab, you will learn how to navigate the filesystem using standard commands like `ls`, `cd`, `pwd`, and `cat`. Look for files that might be hidden or tucked away in `/home/student/.secret/flag.txt`.",
                "flag": "CTF{hidden_file_navigator_77}",
                "hint": "Remember that files starting with a dot (e.g. `.secret`) are hidden. Use the `ls -la` command to list all files, including hidden ones, and check the `/home/student/.secret/flag.txt` path."
            },
            {
                "id": 2,
                "title": "Linux Permissions",
                "difficulty": "Easy",
                "points": 50,
                "category": "Linux",
                "estimated_time": "25m",
                "provider_type": "docker",
                "description": "A protected file named `flag.txt` exists in the home directory. However, you don't seem to have direct read access. Investigate file permissions using `ls -l` and learn how groups, ownerships, or sudo rules might allow you to read this file.",
                "flag": "CTF{chmod_permissions_ninja}",
                "hint": "Check the permissions using `ls -l flag.txt`. If your user doesn't have read access, check if your user belongs to a group with read access, or see if you can run any command as sudo via `sudo -l`."
            },
            {
                "id": 3,
                "title": "Users and Groups",
                "difficulty": "Easy",
                "points": 75,
                "category": "Linux",
                "estimated_time": "30m",
                "provider_type": "docker",
                "description": "Identify a hidden user account in the system that has been configured with an unusual shell, or has a UID that doesn't match standard user schemas. Check user records in `/etc/passwd` and check group configurations in `/etc/group`.",
                "flag": "CTF{hidden_user_identified_88}",
                "hint": "Look at the `/etc/passwd` file. Users with UID 0 or unusual shells like `/bin/false` or `/sbin/nologin` are always suspicious. You can filter the users using `cat /etc/passwd | grep ctf` or look for user accounts with UID >= 1000."
            },
            {
                "id": 4,
                "title": "Log Analysis",
                "difficulty": "Medium",
                "points": 100,
                "category": "Linux",
                "estimated_time": "45m",
                "provider_type": "docker",
                "description": "Your system has been subjected to a brute force attack. Analyze the authorization log file located at `/var/log/auth.log` (simulated). Find the timestamp of the first successful login attempt after a series of failed logins to uncover the compromise. The flag is the MD5 or string representing that login.",
                "flag": "CTF{suspicious_login_found_2026}",
                "hint": "Search for 'Accepted password' or 'Failed password' in `/var/log/auth.log` (or check the files in `/var/log`). You can use `grep 'Accepted' /var/log/auth.log` to find the successful logins."
            },
            {
                "id": 5,
                "title": "Cron Jobs",
                "difficulty": "Medium",
                "points": 100,
                "category": "Linux",
                "estimated_time": "40m",
                "provider_type": "docker",
                "description": "A background task is running periodically. Inspect the system's cron jobs, locate the scheduled script, and read its output or source to retrieve the hidden flag.",
                "flag": "CTF{cron_job_flag_991}",
                "hint": "Check user cron schedules using `crontab -l`, and system-wide cron folders like `/etc/cron.d/`, `/etc/cron.daily/`, or check `/etc/crontab`. Look for scripts running periodically and read their source code."
            },
            {
                "id": 6,
                "title": "Active Directory",
                "difficulty": "Medium",
                "points": 150,
                "category": "Active Directory",
                "estimated_time": "1h 30m",
                "provider_type": "gcp",
                "description": "Probe a simulated Active Directory domain controller. Identify insecure configurations, perform LDAP querying, and exploit kerberoasting vulnerabilities or weak passwords to escalate to Domain Admin and retrieve the domain controller flag.",
                "flag": "CTF{ad_compromised_domain_admin}",
                "hint": "Use `nmap` connect scan to find open ports (LDAP 389, SMB 445). From the Kali terminal, run `nmap --unprivileged -sT -Pn ctf-gcp-victim-[user_id]-6` to check the ports. If SMB is open, list shares or query LDAP."
            },
            {
                "id": 7,
                "title": "SOC Labs",
                "difficulty": "Medium",
                "points": 150,
                "category": "SOC",
                "estimated_time": "1h 30m",
                "provider_type": "gcp",
                "description": "Analyze system events and security logs from an attacked server in a Security Operations Center lab. Trace the intruder's entry point, identify command execution history, and uncover the flag hidden inside the root investigator notes.",
                "flag": "CTF{soc_log_analysis_complete}",
                "hint": "Check the command execution history in `/root/.bash_history` or check the application logs in `/var/log/nginx/` or `/var/log/syslog` to see what command the attacker ran."
            },
            {
                "id": 8,
                "title": "Cloud Security Labs",
                "difficulty": "Hard",
                "points": 200,
                "category": "Cloud Security",
                "estimated_time": "2h",
                "provider_type": "gcp",
                "description": "Investigate a misconfigured cloud instance that exposes instance metadata APIs. Use this to pivot, retrieve cloud credentials, scan storage buckets, and extract a sensitive flag from protected bucket storage.",
                "flag": "CTF{cloud_metadata_leaked_99}",
                "hint": "Query the simulated cloud metadata service on the victim at port 8080. You can query `http://ctf-gcp-victim-[user-id]-8:8080/` to fetch credentials or bucket details."
            },
            {
                "id": 9,
                "title": "Kubernetes Labs",
                "difficulty": "Hard",
                "points": 200,
                "category": "Kubernetes",
                "estimated_time": "2h",
                "provider_type": "gcp",
                "description": "Gain initial shell access on a container running inside a Kubernetes cluster. Traverse namespaces, perform service account token abuse, escape the pod sandbox, and read the master host node flag.",
                "flag": "CTF{k8s_pod_escape_success}",
                "hint": "Examine the `/var/run/secrets/kubernetes.io/serviceaccount/` directory inside the pod. Use the token to authenticate to the Kubernetes API at port 6443 using `curl` or `kubectl`."
            }
        ]

        # Check if database is already seeded
        if db.query(Challenge).first() is not None:
            # Update hints and flags for existing challenges if not populated or mismatch
            for data in challenges_data:
                c = db.query(Challenge).filter(Challenge.id == data["id"]).first()
                if c:
                    c.hint = data["hint"]
                    f = db.query(Flag).filter(Flag.challenge_id == c.id).first()
                    if f:
                        f.flag_value = data["flag"]
            db.commit()
            print("Database already contains data, updated hints and flags, and skipping full seed.")
            return

        print("Seeding database with challenges and mock users...")

        challenges = []
        for data in challenges_data:
            c = Challenge(
                id=data["id"],
                title=data["title"],
                description=data["description"],
                difficulty=data["difficulty"],
                points=data["points"],
                category=data["category"],
                estimated_time=data["estimated_time"],
                provider_type=data["provider_type"],
                hint=data["hint"]
            )
            db.add(c)
            # Create flag
            f = Flag(challenge=c, flag_value=data["flag"])
            db.add(f)
            challenges.append(c)
        
        db.commit()

        # 2. Add Admin User
        admin_user = User(
            username="admin",
            email="admin@ctf.platform",
            password_hash=get_password_hash("Password123!"),
            points=0,
            rank=None,
            is_admin=True,
            created_at=datetime.utcnow() - timedelta(days=15),
            last_login=datetime.utcnow()
        )
        db.add(admin_user)
        db.commit()

        # 3. Add Mock Users for Scoreboard
        mock_users_data = [
            {
                "username": "l33t_haxor",
                "email": "haxor@ctf.platform",
                "password": "Password123!",
                "points": 175,
                "rank": 1,
                "solved_challenges": [1, 2, 3]  # total points: 50+50+75 = 175
            },
            {
                "username": "cyber_ninja",
                "email": "ninja@ctf.platform",
                "password": "Password123!",
                "points": 100,
                "rank": 2,
                "solved_challenges": [1, 2]  # total points: 50+50 = 100
            },
            {
                "username": "soc_analyst_pro",
                "email": "soc@ctf.platform",
                "password": "Password123!",
                "points": 175,
                "rank": 3,
                "solved_challenges": [3, 4]  # total points: 75+100 = 175
            },
            {
                "username": "linux_rookie",
                "email": "rookie@ctf.platform",
                "password": "Password123!",
                "points": 50,
                "rank": 4,
                "solved_challenges": [1]  # total points: 50
            },
            {
                "username": "flag_finder",
                "email": "finder@ctf.platform",
                "password": "Password123!",
                "points": 0,
                "rank": 5,
                "solved_challenges": []
            }
        ]

        for u_data in mock_users_data:
            user = User(
                username=u_data["username"],
                email=u_data["email"],
                password_hash=get_password_hash(u_data["password"]),
                points=u_data["points"],
                rank=u_data["rank"],
                created_at=datetime.utcnow() - timedelta(days=10),
                last_login=datetime.utcnow() - timedelta(hours=3),
                is_admin=False
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            # Record submissions for these mock users
            for c_id in u_data["solved_challenges"]:
                sub = Submission(
                    user_id=user.id,
                    challenge_id=c_id,
                    submitted_flag=challenges_data[c_id - 1]["flag"],
                    status="Correct",
                    submitted_at=datetime.utcnow() - timedelta(days=2, hours=c_id)
                )
                db.add(sub)
            db.commit()

        print("Database seeding completed successfully.")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    from .database import engine, Base
    print("Creating tables if they do not exist...")
    Base.metadata.create_all(bind=engine)
    print("Seeding database...")
    seed_db()
