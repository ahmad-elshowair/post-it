# Quickstart: Rate Limiting & Security Hardening

## Prerequisites
- Node.js 18+
- PostgreSQL running (existing)
- Redis 7+ running on localhost:6379 (new requirement)

## Redis Setup

### Local Development
```bash
# Using Docker
docker run -d --name post-it-redis -p 6379:6379 redis:7-alpine

# Or using Homebrew
brew install redis
brew services start redis
```

### Environment Variables
Add these to your `.env` file:
```env
# Redis
REDIS_URL=redis://localhost:6379

# Rate Limiting (with defaults shown)
RATE_LIMIT_GLOBAL_WINDOW_MS=60000
RATE_LIMIT_GLOBAL_MAX=150
RATE_LIMIT_AUTH_WINDOW_MS=900000
RATE_LIMIT_AUTH_MAX=5
RATE_LIMIT_CONTENT_WINDOW_MS=60000
RATE_LIMIT_CONTENT_MAX=25

# Upload Security
UPLOAD_MAX_SIZE_BYTES=5242880
UPLOAD_ALLOWED_MIMES=image/jpeg,image/png,image/webp,image/gif
```

## Install Dependencies
```bash
cd server
pnpm add express-rate-limit rate-limit-redis ioredis file-type
pnpm add -D @types/ioredis
```

## Verification Steps

### 1. Verify Redis connection
```bash
redis-cli ping
# Expected: PONG
```

### 2. Verify rate limiting
```bash
# Global rate limit (150/min)
for i in $(seq 1 160); do curl -s http://localhost:5000/api/users; done
# Should see 429 after request 151

# Auth rate limit (5/15min)
for i in $(seq 1 10); do curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"wrong"}'; done
# Should see 429 after request 6
```

### 3. Verify upload validation
```bash
# Upload a valid image (should succeed)
curl -X POST http://localhost:5000/api/upload -F "file=@test.jpg" -F "folder=posts"

# Upload an executable renamed to .png (should fail)
cp /bin/ls fake.png
curl -X POST http://localhost:5000/api/upload -F "file=@fake.png" -F "folder=posts"
# Expected: 400 "File type not allowed"

# Upload oversized file (should fail)
dd if=/dev/zero oflarge=6M.jpg bs=1 count=6291456
curl -X POST http://localhost:5000/api/upload -F "file=@large.jpg" -F "folder=posts"
# Expected: 413 "File size exceeds 5MB limit"

# Path traversal (should fail)
curl -X POST http://localhost:5000/api/upload -F "file=@test.jpg" -F "folder=../../etc"
# Expected: 400 "Invalid folder name"
```

### 4. Verify CSP headers
```bash
curl -I http://localhost:5000/
# Should include Content-Security-Policy header
```

### 5. Verify like debounce
Open the app, the browser, rapidly click like on a post 10 times.
Check network tab: only 1 request sent after 500ms.
```
