FROM alpine:latest
RUN apk add --no-cache ttyd

# Create student user
RUN adduser -D -s /bin/sh student

# Place hidden flag
RUN mkdir -p /home/student/.secret && \
    echo "CTF{hidden_file_navigator_77}" > /home/student/.secret/flag.txt && \
    chown -R student:student /home/student

WORKDIR /home/student

EXPOSE 7681

# Run ttyd serving su - student
CMD ["ttyd", "-p", "7681", "-W", "-i", "0.0.0.0", "su", "-", "student"]
