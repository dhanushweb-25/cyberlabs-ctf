FROM alpine:latest
RUN apk add --no-cache ttyd

# Create student user
RUN adduser -D -s /bin/sh student

# Create flag user with GECOS field containing the flag
RUN adduser -D -g "CTF{hidden_user_identified_88}" -s /sbin/nologin flaguser

WORKDIR /home/student

EXPOSE 7681

# Run ttyd serving su - student
CMD ["ttyd", "-p", "7681", "-W", "-i", "0.0.0.0", "su", "-", "student"]
