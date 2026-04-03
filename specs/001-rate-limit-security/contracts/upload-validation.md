# Upload Validation Contract
## Overview

File upload endpoint secured with MIME-type magic-byte validation, size limits, and path traversal rejection.

## Affected Endpoint
`POST /api/upload` (existing endpoint, modifications only)

## Multer Configuration Changes
### Before (current)
```typescript
const upload = multer({ storage });
```
No `fileFilter`, no `limits`.

### After (new)
```typescript
const upload = multer({
  storage,
  limits: {
    fileSize: config.upload_max_size,  // 5MB default
  },
  fileFilter: validateUploadFile,
});
```

## MIME Allowlist
| Type | Magic Bytes | Extension |
|---|---|---|
| image/jpeg | FF D8 FF E0 | .jpg, .jpeg |
| image/png | 89 50 4E 47 | .png |
| image/webp | 52 49 46 46 | .webp |
| image/gif | 47 49 46 38 | .gif |

## Validation Flow
1. Check file size (multer `limits.fileSize`) — reject if > 5MB
2. Read first 4-12 bytes of memory buffer
3. Detect actual MIME type via `file-type` library
4. Compare against allowlist (image/jpeg, image/png, image/webp, image/gif)
5. If MIME doesn't match — reject with 400 error
6. Validate folder name against ALLOWED_FOLDERS allowlist

## Folder Name Validation
- Reject (not sanitize) any folder containing: `..`, `/`, `\\`, null bytes
- Return 400 error with message: "Invalid folder name"
- Valid folder names: alphanumeric, hyphens, underscores only

## Error Responses
| Condition | HTTP Status | Message |
|---|---|---|
| No file uploaded | 400 | "No file uploaded" |
| File too large | 413 | "File size exceeds 5MB limit" |
| Invalid MIME type | 400 | "File type not allowed. Accepted types: JPEG, PNG, WebP, GIF" |
| Path traversal in folder | 400 | "Invalid folder name" |

## Migration from diskStorage to memoryStorage

When switching from `multer.diskStorage` to `multer.memoryStorage`, the following existing behaviors MUST be preserved:
1. **Filename generation**: The date-based unique suffix pattern (`DD-M-YYYY-milliseconds-originalname`) must be preserved and applied via `fs.writeFile` after validation.
2. **Directory creation**: The `recursive: true` mkdir for the target folder must still occur before writing.
3. **Folder resolution**: The `folder` field from `req.body` is still used, but validated against `ALLOWED_FOLDERS` before any filesystem operation.
