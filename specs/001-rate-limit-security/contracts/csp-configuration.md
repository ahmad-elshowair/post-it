# Content Security Policy Contract
## Overview

Configure Helmet CSP directives for all server responses. Environment-aware: strict in production, relaxed in development.

## Helmet Configuration
### Before (current)
```typescript
app.use(helmet());  // Default config only
```

### After (new)
```typescript
app.use(helmet({
  contentSecurityPolicy: config.node_env === "development"
    ? devCSPDirectives
    : prodCSPDirectives,
}));
```

## CSP Directives

### Production
```
Content-Security-Policy:
  script-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  img-src 'self';
  style-src 'self' 'unsafe-inline';
  font-src 'self';
  connect-src 'self';
```

**Note**: `style-src 'unsafe-inline'` is needed because MUI and Bootstrap use inline styles.

### Development
```
Content-Security-Policy:
  script-src 'self' 'unsafe-eval' 'unsafe-inline' http://localhost:3000;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  img-src 'self' http://localhost:3000;
  style-src 'self' 'unsafe-inline' http://localhost:3000;
  font-src 'self';
  connect-src 'self' http://localhost:3000 ws://localhost:3000;
```

**Note**: Development mode relaxes `unsafe-eval` for React hot module replacement (HMR) and allows `localhost:3000` for client dev server.

## Headers Set
| Header | Production | Development |
|---|---|---|
| Content-Security-Policy | Strict (see above) | Relaxed (see above) |
| X-Content-Type-Options | nosniff | nosniff |
| X-Frame-Options | DENY | DENY |
| X-XSS-Protection | 1; mode=block | 1; mode=block |
| Strict-Transport-Security | max-age=15552000; includeSubDomains | (if HTTPS) | (if HTTPS) |
