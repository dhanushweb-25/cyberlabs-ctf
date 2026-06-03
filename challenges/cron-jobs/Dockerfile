FROM alpine:latest
RUN apk add --no-cache ttyd

# Create student user
RUN adduser -D -s /bin/sh student

# Create cleanup script with the flag in comments
RUN mkdir -p /usr/local/bin && \
    echo '#!/bin/sh' > /usr/local/bin/cleanup.sh && \
    echo '# Temporary cleanup script' >> /usr/local/bin/cleanup.sh && \
    echo '# Flag: CTF{cron_job_flag_991}' >> /usr/local/bin/cleanup.sh && \
    echo 'rm -rf /tmp/.* 2>/dev/null || true' >> /usr/local/bin/cleanup.sh && \
    chmod 755 /usr/local/bin/cleanup.sh

# Configure cron job for student
RUN mkdir -p /var/spool/cron/crontabs && \
    echo "* * * * * /usr/local/bin/cleanup.sh" > /var/spool/cron/crontabs/student && \
    chmod 600 /var/spool/cron/crontabs/student && \
    chown student:wheel /var/spool/cron/crontabs/student

WORKDIR /home/student

EXPOSE 7681

# Run ttyd serving su - student
CMD ["ttyd", "-p", "7681", "-W", "-i", "0.0.0.0", "su", "-", "student"]
