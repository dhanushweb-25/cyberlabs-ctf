FROM ctf-kali-attack:latest
USER root

# Create student user
RUN useradd -m -s /bin/bash student

# Place flag owned by root and readable only by root
RUN echo "CTF{chmod_permissions_ninja}" > /home/student/flag.txt && \
    chmod 400 /home/student/flag.txt && \
    chown root:root /home/student/flag.txt

# Configure sudo rule for student
RUN echo "student ALL=(ALL) NOPASSWD: /usr/bin/cat /home/student/flag.txt" > /etc/sudoers.d/student && \
    chmod 0440 /etc/sudoers.d/student

WORKDIR /home/student
USER student
EXPOSE 7681

# Run ttyd serving bash as student
CMD ["ttyd", "-p", "7681", "-W", "-i", "0.0.0.0", "bash"]
