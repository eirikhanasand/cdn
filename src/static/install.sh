#!/bin/bash

if [[ $EUID -ne 0 ]]; then
  echo "This script must be run as root. Use sudo." >&2
  exit 2
fi

# ----- Adds swap -----

swapon --show
free -h
sudo fallocate -l 4G /beeswap
sudo chmod 600 /beeswap
sudo mkswap /beeswap
sudo swapon /beeswap
echo "/beeswap none swap sw 0 0" | sudo tee -a /etc/fstab

# ----- Creates scripts folder -----

mkdir -p ~/scripts

cat << 'EOF' > ~/scripts/docker_clean.sh
#!/bin/bash
docker system prune -a --volumes -f
EOF

chmod +x ~/scripts/docker_clean.sh

# ----- Installs docker -----

sudo apt update
sudo apt install -y ca-certificates curl gnupg lsb-release

sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# docker compose up --build

docker version
docker compose version

sudo usermod -aG docker $USER
newgrp docker

# ----- Adds current user as nginx editor -----

sudo groupadd nginxedit
sudo usermod -aG nginxedit $USER
sudo chgrp -R nginxedit /etc/nginx
sudo chmod -R g+w /etc/nginx
sudo chmod g+s /etc/nginx
groups
su - $USER

# ----- Adds nvm -----

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

# ----- Removes excess motd files -----

rm -f /etc/update-motd.d/50-motd-news
rm -f /etc/update-motd.d/97-overlayroot
rm -f /etc/update-motd.d/98-fsck-at-reboot

# ----- Updates sysinfo file to be more concise -----

cat > /usr/share/landscape/landscape-sysinfo.wrapper << 'EOF'
#!/bin/sh
# don't try refresh this more than once per minute
# Due to cpu consumption and login delays (LP: #1893716)
CACHE="/var/lib/landscape/landscape-sysinfo.cache"
HAS_CACHE="FALSE"
CACHE_NEEDS_UPDATE="FALSE"

[ -r "$CACHE" ] && HAS_CACHE="TRUE"
[ -z "$(find "$CACHE" -newermt 'now-1 minutes' 2> /dev/null)" ] && CACHE_NEEDS_UPDATE="TRUE"

if [ "$HAS_CACHE" = "TRUE" ] && [ "$CACHE_NEEDS_UPDATE" = "FALSE" ]; then
    cat "$CACHE"
else
    SYSINFO=""

    # pam_motd does not carry the environment
    [ -f /etc/default/locale ] && . /etc/default/locale
    export LANG
    CORES=$(grep -c ^processor /proc/cpuinfo 2>/dev/null)
    [ "$CORES" -eq "0" ] && CORES=1
    THRESHOLD="${CORES:-1}.0"

    if [ $(echo "`cut -f1 -d ' ' /proc/loadavg` < $THRESHOLD" | bc) -eq 1 ]; then
        SYSINFO=$(printf "\n System information as of %s\n\n%s\n" \
            "$(/bin/date)" \
            "$(/usr/bin/landscape-sysinfo)")
        echo "$SYSINFO" 2>/dev/null >"$CACHE" || true
        chmod 0644 "$CACHE" 2>/dev/null || true
    else
        SYSINFO=$(printf "\n System information disabled due to load higher than %s\n" "$THRESHOLD")

        if [ "$HAS_CACHE" = "TRUE" ]; then
            if ! grep -q "System information as of" $CACHE 2>/dev/null; then
                # do not replace a formerly good result due to load
                echo "$SYSINFO" 2>/dev/null >"$CACHE" || true
                chmod 0644 "$CACHE" 2>/dev/null || true
            else
                SYSINFO=$(cat "$CACHE")
            fi
        fi
    fi

    printf "%s\n" "$SYSINFO"
fi

exit 0
EOF

# ----- Adds cronjob to remove dangling Docker containers -----

( crontab -l 2>/dev/null; \
  echo "# removes dangling docker entities every day at 3am"; \
  echo "0 3 * * * /usr/bin/docker system prune -a --volumes -f >/dev/null 2>&1" \
) | crontab -

# ---- Adds alias -----

cat >> ~/.bashrc << 'EOF'
alias cert="cat /etc/cron.d/certbot"
alias config="sudo nano ~/.bashrc"
alias dockerrestart="restartdocker"
alias egrep="egrep --color=auto"
alias fgrep="fgrep --color=auto"
alias grep="grep --color=auto"
alias l="ls -CF"
alias la="ls -A"
alias ll="ls -alF"
alias ls="ls --color=auto"
alias lua="sudo nano /etc/nginx/lua/traffic_logger.lua"
alias nginxconf="sudo nano /usr/local/openresty/nginx/conf/nginx.conf"
alias nginxconfig="cd /etc/nginx/sites-available; git pull; sudo nano /etc/nginx/sites-available/default"
alias nginxreload="sudo /usr/local/openresty/nginx/sbin/nginx -s reload"
alias nginxstart="sudo /usr/local/openresty/bin/openresty"
alias nginxstop="sudo /usr/local/openresty/bin/openresty -s stop"
alias nginxtest="sudo /usr/local/openresty/nginx/sbin/nginx -t"
alias scouterbee="cd ~/scouterbee; git pull; pm2 restart scouterbe"
alias internal="cd ~/internal; git pull; pm2 restart internal"
alias rebuild="git pull; docker compose up --build"
alias redeploy="rebuild"
alias reload="source ~/.bashrc"
alias restartdocker="sudo systemctl restart docker"
alias viewcert="sudo certbot certificates"
EOF

# ----- Adds DNS services -----

cat > /etc/systemd/resolved.conf << 'EOF'
# 1. sudo nano /etc/systemd/resolved.conf
# 2. sudo systemctl restart systemd-resolved
# 3. resolvectl status

#  This file is part of systemd.
#
#  systemd is free software; you can redistribute it and/or modify it under the
#  terms of the GNU Lesser General Public License as published by the Free
#  Software Foundation; either version 2.1 of the License, or (at your option)
#  any later version.
#
# Entries in this file show the compile time defaults. Local configuration
# should be created by either modifying this file (or a copy of it placed in
# /etc/ if the original file is shipped in /usr/), or by creating "drop-ins" in
# the /etc/systemd/resolved.conf.d/ directory. The latter is generally
# recommended. Defaults can be restored by simply deleting the main
# configuration file and all drop-ins located in /etc/.
#
# Use 'systemd-analyze cat-config systemd/resolved.conf' to display the full config.
#
# See resolved.conf(5) for details.

[Resolve]
Cloudflare: 1.1.1.1#cloudflare-dns.com 1.0.0.1#cloudflare-dns.com 2606:4700:4700::1111#cloudflare-dns.com 2606:4700:4700::1001#cloudflare-dns.com
Google:     8.8.8.8#dns.google 8.8.4.4#dns.google 2001:4860:4860::8888#dns.google 2001:4860:4860::8844#dns.google
Quad9:      9.9.9.9#dns.quad9.net 149.112.112.112#dns.quad9.net 2620:fe::fe#dns.quad9.net 2620:fe::9#dns.quad9.net
DNS=8.8.8.8 1.1.1.1 213.186.33.99 10.177.195.1
FallbackDNS=9.9.9.9 1.0.0.1
DNSSEC=no
DNSOverTLS=no
MulticastDNS=no
LLMNR=no
Cache=yes
DNSStubListener=yes
ReadEtcHosts=yes
ResolveUnicastSingleLabel=no
StaleRetentionSec=30
EOF

# ----- Adds DNS services -----

cat > /etc/docker/daemon.json << 'EOF'
{
  "dns": ["8.8.8.8", "1.1.1.1", "10.177.195.1", "213.186.33.99"],
  "registry-mirrors": ["https://mirror.gcr.io"],
  "storage-driver": "overlay2"
}
EOF

# ----- Reduces swap usage -----

cat > /etc/security/sysctl.conf << 'EOF'
vm.swappiness = 30

# Reload with `sudo sysctl --system`
EOF

sudo sysctl --system

# ----- Clones services -----

cd ~
git clone git@github.com:Login-Linjeforening-for-IT/queenbee.git
git clone git@github.com:Login-Linjeforening-for-IT/beekeeper.git
git clone git@github.com:Login-Linjeforening-for-IT/gitbee.git
git clone git@github.com:Login-Linjeforening-for-IT/beeswarm.git
git clone git@github.com:Login-Linjeforening-for-IT/nucleus_notifications.git
git clone git@github.com:Login-Linjeforening-for-IT/app_api.git
git clone git@github.com:Login-Linjeforening-for-IT/scouterbee.git
git clone git@github.com:Login-Linjeforening-for-IT/workerbee.git
git clone git@github.com:Login-Linjeforening-for-IT/beehive.git
git clone git@github.com:Login-Linjeforening-for-IT/studentbee.git
git clone git@github.com:Login-Linjeforening-for-IT/tekkom_bot.git
git clone git@github.com:Login-Linjeforening-for-IT/beeformed.git
git clone git@github.com:Login-Linjeforening-for-IT/dizambee.git
git clone git@github.com:Login-Linjeforening-for-IT/internal.git
git clone git@github.com:Login-Linjeforening-for-IT/gatherbee.git

# ----- Changes directory to clone nginx config -----

cd /etc/nginx
git clone git@github.com:Login-Linjeforening-for-IT/nginx.git
mv nginx sites-available

# ----- Installs pm2 -----

npm install -g pm2

# ----- Starts docker services -----

cd ~
cd ~/app_api; rebuild -d
cd ~/beeformed; rebuild -d
cd ~/beehive; rebuild -d
cd ~/beekeeper; rebuild -d
cd ~/beeswarm; rebuild -d
cd ~/dizambee; rebuild -d
cd ~/gitbee; rebuild -d
cd ~/nucleus_notifications; rebuild -d
cd ~/queenbee; rebuild -d
cd ~/studentbee; rebuild -d
cd ~/tekkom_bot; rebuild -d
cd ~/workerbee; rebuild -d
cd ~/gatherbee; rebuild -d

# ----- Starts pm2 services -----

cd ~/internal; pm2 start src/index.ts --name internal --interpreter node
cd ~/scouterbee; pm2 start src/index.ts --name scouterbee --interpreter node
