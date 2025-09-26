# Digital Ocean Spaces Setup Guide

## Overview

This guide covers setting up Digital Ocean Spaces for file storage in the NodeAngularFullStack
application.

## Spaces Configuration

### 1. Create Spaces Bucket

1. Go to Digital Ocean Control Panel > Spaces
2. Create a new Space with the following settings:
   - **Name**: `nodeangularfullstack-storage`
   - **Region**: `NYC3` (or your preferred region)
   - **CDN**: Enable CDN for better performance
   - **File Listing**: Disable for security

### 2. CORS Configuration

Configure CORS settings for the Space to allow frontend access:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "https://your-domain.com",
        "https://nodeangularfullstack-web.ondigitalocean.app"
      ],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

### 3. API Keys

Create Spaces API keys:

1. Go to API section in Digital Ocean Control Panel
2. Generate new Spaces Key
3. Save the following values:
   - **Access Key ID**: `DO_SPACES_KEY`
   - **Secret Access Key**: `DO_SPACES_SECRET`

### 4. Environment Variables

Add these environment variables to your Digital Ocean App:

```bash
DO_SPACES_ENDPOINT=https://lon1.digitaloceanspaces.com
DO_SPACES_KEY=DO00LZ22KQG9RLBMBNFE
DO_SPACES_SECRET=pwyJ8Xt+eUJTbJFLwDQxdVJr8KKWbJML6PdlP0n6ir8
DO_SPACES_BUCKET=my-pdfs
DO_SPACES_REGION=lon1
```

## Folder Structure

Organize files in the following structure:

```
nodeangularfullstack-storage/
├── avatars/              # User profile images
├── documents/            # Document uploads
├── temp/                 # Temporary files (auto-cleanup)
├── backups/             # Database backups
└── static/              # Static assets
    ├── images/
    └── media/
```

## Security Best Practices

### 1. Bucket Policies

Set appropriate bucket policies to restrict access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyDirectAccess",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::nodeangularfullstack-storage/private/*"
    },
    {
      "Sid": "AllowPublicRead",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::nodeangularfullstack-storage/public/*"
    }
  ]
}
```

### 2. File Upload Validation

- Implement file type validation
- Set maximum file size limits
- Scan for malware before storage
- Generate secure file names

### 3. CDN Configuration

- Enable CDN for static content
- Set appropriate cache headers
- Configure custom domain if needed

## Implementation Example

### Backend Service (Express.js)

```typescript
import AWS from 'aws-sdk';

const spacesEndpoint = new AWS.Endpoint('nyc3.digitaloceanspaces.com');
const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.DO_SPACES_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET,
});

export const uploadFile = async (file: Buffer, key: string) => {
  const params = {
    Bucket: 'nodeangularfullstack-storage',
    Key: key,
    Body: file,
    ACL: 'public-read',
  };

  return s3.upload(params).promise();
};
```

### Frontend Service (Angular)

```typescript
export class FileUploadService {
  uploadToSpaces(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post('/api/upload', formData);
  }
}
```

## Monitoring and Backup

### 1. Usage Monitoring

- Monitor storage usage through DO dashboard
- Set up alerts for high usage
- Track bandwidth consumption

### 2. Backup Strategy

- Regular backups to separate Space
- Cross-region replication for critical data
- Automated backup scripts

### 3. Cost Optimization

- Implement lifecycle policies
- Clean up temporary files regularly
- Use appropriate storage classes

## SSL/TLS Configuration

- Spaces automatically provide SSL/TLS
- Custom domains require SSL certificate setup
- Ensure all API calls use HTTPS

## Performance Optimization

- Use CDN for static content delivery
- Implement client-side caching
- Optimize image sizes and formats
- Use compression where appropriate
