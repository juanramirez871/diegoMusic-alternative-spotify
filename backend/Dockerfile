FROM node:20-alpine

RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip \
    ca-certificates \
    curl \
    bash \
    deno

# yt-dlp + yt-dlp-ejs from PyPI (not the standalone binary): current YouTube
# needs the EJS challenge solver, and yt-dlp only runs it under Deno — Node is
# rejected as "unsupported". The `yt-dlp` shim keeps the CLI name working.
RUN pip install --no-cache-dir --break-system-packages yt-dlp yt-dlp-ejs && \
    printf '#!/bin/sh\nexec python3 -m yt_dlp "$@"\n' > /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Deno writes its solver-script cache here; keep it off the read-only-ish root.
ENV DENO_DIR=/tmp/deno_cache

WORKDIR /app
COPY package*.json ./

RUN npm install --omit=dev --legacy-peer-deps
COPY . .

EXPOSE 3000
CMD ["npm", "start"]
