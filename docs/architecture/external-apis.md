# External APIs

## SendGrid API
- **Purpose:** Transactional email delivery for password resets, welcome emails, and notifications
- **Documentation:** https://docs.sendgrid.com/api-reference/mail-send/mail-send
- **Base URL(s):** https://api.sendgrid.com/v3
- **Authentication:** API Key in Authorization header
- **Rate Limits:** 10,000 emails/day (free tier), 3,000 requests/second

**Key Endpoints Used:**
- `POST /mail/send` - Send transactional emails

**Integration Notes:** Use template IDs for consistent email formatting, implement retry logic for failed sends

## Digital Ocean Spaces API
- **Purpose:** File upload and storage for user avatars and application assets
- **Documentation:** https://docs.digitalocean.com/products/spaces/reference/s3-compatibility/
- **Base URL(s):** https://nyc3.digitaloceanspaces.com
- **Authentication:** Access Key ID and Secret Access Key (S3-compatible)
- **Rate Limits:** No hard limits, fair use policy

**Key Endpoints Used:**
- `PUT /{bucket}/{key}` - Upload file
- `GET /{bucket}/{key}` - Retrieve file
- `DELETE /{bucket}/{key}` - Delete file

**Integration Notes:** Use pre-signed URLs for direct browser uploads, implement CDN for public assets
