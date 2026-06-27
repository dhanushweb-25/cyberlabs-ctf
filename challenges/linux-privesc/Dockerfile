FROM ctf-kali-attack:latest
USER root

# Create student user
RUN useradd -m -s /bin/bash student

# Place flag owned by root and readable only by root
RUN echo "CTF{python_library_hijack_master}" > /root/flag.txt && \
    chmod 400 /root/flag.txt && \
    chown root:root /root/flag.txt

# Create backup script
RUN mkdir -p /opt && \
    echo -e "import helper\n\nprint('Running system backup daemon...')" > /opt/backup.py && \
    chmod 644 /opt/backup.py && \
    chown root:root /opt/backup.py

# Make /opt directory writable by student so they can hijack python path imports
RUN chmod 777 /opt

# Configure sudo rule for student
RUN echo "student ALL=(ALL) NOPASSWD: /usr/bin/python3 /opt/backup.py" > /etc/sudoers.d/student && \
    chmod 0440 /etc/sudoers.d/student

WORKDIR /home/student
USER student
EXPOSE 7681

# Run ttyd serving bash as student
CMD ["ttyd", "-p", "7681", "-W", "-i", "0.0.0.0", "bash"]
