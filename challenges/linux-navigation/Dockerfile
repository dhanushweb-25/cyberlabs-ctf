FROM ctf-kali-attack:latest
USER root

# Create student user
RUN useradd -m -s /bin/bash student

# Place hidden flag
RUN mkdir -p /home/student/.secret && \
    echo "CTF{hidden_file_navigator_77}" > /home/student/.secret/flag.txt && \
    chown -R student:student /home/student

WORKDIR /home/student
USER student
EXPOSE 7681

# Run ttyd serving bash as student
CMD ["ttyd", "-p", "7681", "-W", "-i", "0.0.0.0", "bash"]
