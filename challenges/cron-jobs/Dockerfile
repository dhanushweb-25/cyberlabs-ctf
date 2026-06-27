FROM kalilinux/kali-rolling:latest
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    nmap hydra curl netcat-traditional iputils-ping dnsutils whois sudo bash ca-certificates python3 git cron \
    && rm -rf /var/lib/apt/lists/*
ADD https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.x86_64 /usr/local/bin/ttyd
RUN chmod +x /usr/local/bin/ttyd
RUN useradd -m -s /bin/bash student
RUN mkdir -p /usr/local/bin && \
    echo '#!/bin/sh' > /usr/local/bin/cleanup.sh && \
    echo '# Temporary cleanup script' >> /usr/local/bin/cleanup.sh && \
    echo '# Flag: CTF{cron_job_flag_991}' >> /usr/local/bin/cleanup.sh && \
    echo 'rm -rf /tmp/.* 2>/dev/null || true' >> /usr/local/bin/cleanup.sh && \
    chmod 755 /usr/local/bin/cleanup.sh
RUN mkdir -p /var/spool/cron/crontabs && \
    echo "* * * * * /usr/local/bin/cleanup.sh" > /var/spool/cron/crontabs/student && \
    chmod 600 /var/spool/cron/crontabs/student && \
    chown student:crontab /var/spool/cron/crontabs/student
WORKDIR /home/student
EXPOSE 7681
CMD ["ttyd", "-p", "7681", "-W", "-i", "0.0.0.0", "su", "-", "student"]
