FROM kalilinux/kali-rolling:latest
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    nmap hydra curl netcat-traditional iputils-ping dnsutils whois sudo bash ca-certificates python3 git \
    && rm -rf /var/lib/apt/lists/*
ADD https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.x86_64 /usr/local/bin/ttyd
RUN chmod +x /usr/local/bin/ttyd
RUN useradd -m -s /bin/bash student
RUN useradd -m -c "CTF{hidden_user_identified_88}" -s /usr/sbin/nologin flaguser
WORKDIR /home/student
EXPOSE 7681
CMD ["ttyd", "-p", "7681", "-W", "-i", "0.0.0.0", "su", "-", "student"]
