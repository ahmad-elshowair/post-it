# Quickstart: Fix Auth Rate Limiter

**Feature Branch**: `002-fix-auth-rate-limit` | **Date**: 2026-04-04

## Prerequisites

- Redis running on `localhost:6379` (`redis-cli ping` → `PONG`)
- PostgreSQL running and migrated
- Server running on `http://localhost:8000`
- Client running on `http://localhost:3000`

## Verification Steps

### US1: Normal Browsing Without Lockout (P1)

1. Register or log in to obtain a session
2. Refresh the page 10 times within 2 minutes
3. **Verify**: All page loads succeed — zero 429 errors
4. Log out, then log back in immediately
5. **Verify**: Login succeeds without "too many requests"

### US2: Brute-Force Protection Maintained (P1)

1. Send 6 rapid login attempts with invalid credentials:
   ```bash
   for i in $(seq 1 6); do curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"wrong"}'; echo; done
   ```
2. **Verify**: Requests 1-5 return 401 (invalid credentials); request 6 returns 429
3. **Verify**: 429 response includes `Retry-After` header
4. Send 5 registration attempts (same IP):
   ```bash
   for i in $(seq 1 5); do curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/api/auth/register -H "Content-Type: application/json" -d '{"email":"test'$i'@test.com","username":"test'$i'","password":"Password1!"}'; echo; done
   ```
5. **Verify**: Registration attempts succeed (separate counter from login — not blocked by login rate limit)

### US3: Token Refresh Abuse Prevention (P2)

1. Log in and capture cookies from the response
2. Send 31 rapid refresh-token requests:
   ```bash
   for i in $(seq 1 31); do curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/api/auth/refresh-token -b "refresh_token=YOUR_TOKEN"; echo; done
   ```
3. **Verify**: Requests 1-30 succeed; request 31 returns 429
4. **Verify**: 429 response includes `Retry-After` header

### General: Logout and Is-Authenticated Under Global Only

1. Log in to obtain a session
2. Call is-authenticated 20 times rapidly:
   ```bash
   for i in $(seq 1 20); do curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/auth/is-authenticated -H "Authorization: Bearer YOUR_TOKEN"; echo; done
   ```
3. **Verify**: All 20 requests succeed (well under 150/min global limit)
4. Log out successfully
5. **Verify**: Logout returns 200 without 429
