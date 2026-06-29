FROM kalilinux/kali-rolling:latest

# Prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Update and install packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssh-client \
    nmap \
    hydra \
    curl \
    netcat-traditional \
    iputils-ping \
    dnsutils \
    whois \
    sudo \
    bash \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Add precompiled ttyd binary from GitHub
ADD https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.x86_64 /usr/local/bin/ttyd
RUN chmod +x /usr/local/bin/ttyd

# Create a non-root user 'kali' and configure passwordless sudo
RUN useradd -m -s /bin/bash kali && \
    echo "kali:kali" | chpasswd && \
    echo "kali ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Run from the user's home directory
WORKDIR /home/kali
USER kali

EXPOSE 7681

# Serve bash terminal as user kali
CMD ["ttyd", "-p", "7681", "-W", "-i", "0.0.0.0", "bash"]
