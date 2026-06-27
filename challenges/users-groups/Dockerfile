FROM ctf-kali-attack:latest
USER root

# Create student user
RUN useradd -m -s /bin/bash student

# Create flag user with GECOS field containing the flag
RUN useradd -m -c "CTF{hidden_user_identified_88}" -s /usr/sbin/nologin flaguser

WORKDIR /home/student
USER student
EXPOSE 7681

# Run ttyd serving bash as student
CMD ["ttyd", "-p", "7681", "-W", "-i", "0.0.0.0", "bash"]
