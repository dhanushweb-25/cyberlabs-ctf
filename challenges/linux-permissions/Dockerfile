FROM alpine:latest
RUN apk add --no-cache ttyd sudo

# Create student user
RUN adduser -D -s /bin/sh student

# Place flag owned by root and readable only by root
RUN echo "CTF{chmod_permissions_ninja}" > /home/student/flag.txt && \
    chmod 400 /home/student/flag.txt && \
    chown root:root /home/student/flag.txt

# Configure sudo rule for student
RUN echo "student ALL=(ALL) NOPASSWD: /bin/cat /home/student/flag.txt" > /etc/sudoers.d/student && \
    chmod 0440 /etc/sudoers.d/student

WORKDIR /home/student

EXPOSE 7681

# Run ttyd serving su - student
CMD ["ttyd", "-p", "7681", "-W", "-i", "0.0.0.0", "su", "-", "student"]
