FROM ctf-kali-attack:latest
USER root

# Create student user
RUN useradd -m -s /bin/bash student

# Create simulated auth.log
RUN mkdir -p /var/log && \
    echo "Jun  3 10:00:01 server sshd[1234]: Failed password for invalid user admin from 192.168.1.105 port 39281 ssh2" > /var/log/auth.log && \
    echo "Jun  3 10:01:05 server sshd[1235]: Failed password for root from 192.168.1.105 port 39284 ssh2" >> /var/log/auth.log && \
    echo "Jun  3 10:02:10 server sshd[1239]: Failed password for root from 192.168.1.105 port 39288 ssh2" >> /var/log/auth.log && \
    echo "Jun  3 10:03:15 server sshd[1245]: Failed password for root from 192.168.1.105 port 39292 ssh2" >> /var/log/auth.log && \
    echo "Jun  3 10:04:20 server sshd[1250]: Accepted password for root from 192.168.1.105 port 39296 ssh2: flag is CTF{suspicious_login_found_2026}" >> /var/log/auth.log && \
    echo "Jun  3 10:05:00 server sshd[1255]: Received disconnect from 192.168.1.105: 11: user logged out" >> /var/log/auth.log && \
    chmod 644 /var/log/auth.log && \
    chown root:student /var/log/auth.log

WORKDIR /home/student
USER student
EXPOSE 7681

# Run ttyd serving bash as student
CMD ["ttyd", "-p", "7681", "-W", "-i", "0.0.0.0", "bash"]
