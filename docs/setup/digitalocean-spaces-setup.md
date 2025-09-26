# DigitalOcean Spaces Setup Guide

This guide walks you through setting up DigitalOcean Spaces for avatar storage in the
NodeAngularFullStack application.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [DigitalOcean Account Setup](#digitalocean-account-setup)
4. [Creating a Spaces Bucket](#creating-a-spaces-bucket)
5. [Generating Access Keys](#generating-access-keys)
6. [Environment Configuration](#environment-configuration)
7. [CORS Configuration](#cors-configuration)
8. [CDN Setup (Optional)](#cdn-setup-optional)
9. [Security Best Practices](#security-best-practices)
10. [Testing the Setup](#testing-the-setup)
11. [Troubleshooting](#troubleshooting)
12. [Cost Considerations](#cost-considerations)

## Overview

DigitalOcean Spaces is an S3-compatible object storage service that provides scalable, secure, and
cost-effective storage for user-uploaded files like avatars. This integration allows your
application to:

- Store user avatars in the cloud
- Serve images via CDN for fast loading
- Scale storage automatically
- Reduce server storage requirements

## Prerequisites

- DigitalOcean account
- Credit card for billing setup
- Basic understanding of environment variables
- Access to your application's environment configuration

## DigitalOcean Account Setup

### 1. Create DigitalOcean Account

1. Visit [DigitalOcean](https://www.digitalocean.com/)
2. Click "Sign up" and create your account
3. Verify your email address
4. Add a payment method (required for Spaces)

### 2. Access the Control Panel

1. Log in to your DigitalOcean account
2. Navigate to the main dashboard
3. Look for "Spaces" in the sidebar menu

## Creating a Spaces Bucket

### 1. Create Your First Space

1. Go to **Spaces** in the DigitalOcean control panel
2. Click **"Create a Space"**
3. Configure your Space:
   - **Choose a datacenter region**: Select the region closest to your users (e.g., `nyc3`, `sfo3`,
     `ams3`)
   - **Choose a unique name**: Use a descriptive name (e.g., `your-app-name-avatars`)
   - **File Listing**: Set to **"Restricted"** for security
   - **CDN**: Enable if you want faster global delivery

### 2. Space Configuration

**Recommended Settings:**

- **Name**: `your-app-avatars` (replace with your app name)
- **Region**: Choose based on your primary user base:
  - `nyc3` (New York) - US East Coast
  - `sfo3` (San Francisco) - US West Coast
  - `ams3` (Amsterdam) - Europe
  - `sgp1` (Singapore) - Asia
- **File Listing**: Restricted
- **CDN**: Enabled (recommended for better performance)

### 3. Note Your Space Details

After creation, note these details:

- **Space Name**: `your-app-avatars`
- **Region**: `nyc3` (or your chosen region)
- **Endpoint**: `https://nyc3.digitaloceanspaces.com`

## Generating Access Keys

### 1. Create API Keys

1. Go to **API** in the DigitalOcean control panel
2. Scroll to **"Spaces access keys"** section
3. Click **"Generate New Key"**
4. Give it a descriptive name: `your-app-avatar-storage`
5. **Important**: Copy both the **Key** and **Secret** immediately
   - You won't be able to see the secret again!

### 2. Store Keys Securely

```bash
# Example keys (DO NOT use these actual values)
Key: DO00ABC123DEF456GHI789
Secret: very+secret+key+that+you+must+keep+safe/123456789
```

**⚠️ Security Warning**: Never commit these keys to your repository!

## Environment Configuration

### 1. Update Your Environment Files

Add these variables to your environment configuration:

**For Development (`.env.development`)**:

```bash
# DigitalOcean Spaces Configuration
DO_SPACES_ENDPOINT=https://lon1.digitaloceanspaces.com
DO_SPACES_KEY=DO00LZ22KQG9RLBMBNFE
DO_SPACES_SECRET=pwyJ8Xt+eUJTbJFLwDQxdVJr8KKWbJML6PdlP0n6ir8
DO_SPACES_BUCKET=my-pdfs
DO_SPACES_REGION=lon1

# Optional: CDN URL (if enabled)
DO_SPACES_CDN_URL=https://your-app-avatars.nyc3.cdn.digitaloceanspaces.com
```

**For Production (`.env.production`)**:

```bash
# Use the same structure but with production-specific values
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_KEY=${PRODUCTION_SPACES_KEY}
DO_SPACES_SECRET=${PRODUCTION_SPACES_SECRET}
DO_SPACES_BUCKET=your-app-avatars-prod
DO_SPACES_REGION=nyc3
DO_SPACES_CDN_URL=https://your-app-avatars-prod.nyc3.cdn.digitaloceanspaces.com
```

### 2. Environment Variable Explanation

| Variable             | Description                        | Example                                            |
| -------------------- | ---------------------------------- | -------------------------------------------------- |
| `DO_SPACES_ENDPOINT` | Your Space's endpoint URL          | `https://nyc3.digitaloceanspaces.com`              |
| `DO_SPACES_KEY`      | Your Spaces access key             | `DO00ABC123...`                                    |
| `DO_SPACES_SECRET`   | Your Spaces secret key             | `secret+key+here`                                  |
| `DO_SPACES_BUCKET`   | Your Space name                    | `your-app-avatars`                                 |
| `DO_SPACES_REGION`   | Your Space's region                | `nyc3`                                             |
| `DO_SPACES_CDN_URL`  | CDN URL (optional but recommended) | `https://bucket.region.cdn.digitaloceanspaces.com` |

## CORS Configuration

Configure CORS to allow your frontend to upload files directly.

### 1. Access CORS Settings

1. Go to your Space in the DigitalOcean control panel
2. Click on **"Settings"**
3. Scroll to **"CORS (Cross Origin Sharing)"**

### 2. Add CORS Rules

Add the following CORS configuration:

```json
{
  "corsRules": [
    {
      "allowedOrigins": [
        "http://localhost:4200",
        "http://localhost:3000",
        "https://your-production-domain.com"
      ],
      "allowedMethods": ["GET", "POST", "PUT", "DELETE", "HEAD"],
      "allowedHeaders": ["*"],
      "maxAgeSeconds": 3000
    }
  ]
}
```

### 3. CORS Configuration Explanation

- **allowedOrigins**: Your frontend URLs (development and production)
- **allowedMethods**: HTTP methods your app will use
- **allowedHeaders**: Headers allowed in requests
- **maxAgeSeconds**: How long browsers cache CORS info

## CDN Setup (Optional)

CDN (Content Delivery Network) improves performance by serving images from locations closer to
users.

### 1. Enable CDN

1. When creating your Space, check **"Enable CDN"**
2. Or for existing Spaces:
   - Go to your Space settings
   - Find **"CDN"** section
   - Click **"Enable CDN"**

### 2. CDN Benefits

- **Faster Loading**: Images served from edge locations
- **Reduced Bandwidth**: Less traffic to your origin server
- **Better UX**: Faster image loading improves user experience

### 3. CDN URL Format

```
https://your-bucket-name.region.cdn.digitaloceanspaces.com
```

Example:

```
https://my-app-avatars.nyc3.cdn.digitaloceanspaces.com
```

## Security Best Practices

### 1. Key Management

**DO NOT**:

- ❌ Commit keys to your repository
- ❌ Share keys in plain text
- ❌ Use the same keys for dev and production

**DO**:

- ✅ Use environment variables
- ✅ Use different keys for different environments
- ✅ Rotate keys periodically
- ✅ Store keys in secure secret management systems

### 2. Space Security

**Recommended Settings**:

- **File Listing**: Restricted (prevents browsing your files)
- **Access Control**: Public read for avatars (so they display in browser)
- **Separate Spaces**: Use different Spaces for dev/staging/production

### 3. File Upload Security

The application includes these security measures:

- File type validation (only images)
- File size limits (5MB max)
- File signature validation (magic bytes)
- Unique file names (prevents conflicts)

## Testing the Setup

### 1. Test Environment Configuration

Run this command to verify your environment variables:

```bash
# From your API directory
npm run test -- --testNamePattern="StorageService" --verbose
```

### 2. Test File Upload

1. Start your development server:

   ```bash
   npm run dev
   ```

2. Navigate to the profile page
3. Try uploading a test avatar image
4. Check the DigitalOcean Spaces dashboard to see the uploaded file

### 3. Test CDN (if enabled)

1. Upload an avatar
2. Check that the returned URL uses the CDN domain
3. Verify the image loads quickly from different locations

## Troubleshooting

### Common Issues and Solutions

#### 1. "Access Denied" Errors

**Problem**: Upload fails with 403 Forbidden error.

**Solutions**:

- Verify your access keys are correct
- Check that keys have Spaces permissions
- Ensure the bucket name matches exactly

#### 2. CORS Errors in Browser

**Problem**: Browser blocks upload due to CORS policy.

**Solutions**:

- Verify CORS configuration includes your domain
- Check that allowed methods include POST
- Ensure wildcards are configured for headers if needed

#### 3. "Bucket Not Found" Errors

**Problem**: Application can't find the specified bucket.

**Solutions**:

- Verify `DO_SPACES_BUCKET` matches your Space name exactly
- Check that the region in the endpoint matches your Space's region
- Ensure the Space exists and is active

#### 4. Large File Upload Failures

**Problem**: Large images fail to upload.

**Solutions**:

- Check file size limits (default: 5MB)
- Verify network stability for large uploads
- Consider implementing chunked upload for very large files

#### 5. Images Not Loading

**Problem**: Uploaded images don't display in the application.

**Solutions**:

- Verify the Space has public read access
- Check CORS configuration allows GET requests
- Ensure CDN URL is configured correctly if using CDN

### Debug Commands

```bash
# Test database connection
npm --workspace=apps/api run db:migrate

# Check API server logs
npm --workspace=apps/api run dev

# Test storage service
npm --workspace=apps/api run test -- --testNamePattern="storage"

# Check frontend console for errors
# Open browser dev tools and check Network/Console tabs
```

## Cost Considerations

### DigitalOcean Spaces Pricing (as of 2024)

- **Storage**: $5/month for first 250 GB
- **Bandwidth**: $0.01/GB outbound transfer
- **CDN**: Free with Spaces
- **API Requests**: $0.00 (no request charges)

### Cost Optimization Tips

1. **Image Optimization**:
   - Implement client-side image compression
   - Consider multiple image sizes (thumbnails)
   - Use efficient formats (WebP where supported)

2. **Storage Management**:
   - Clean up test/development files regularly
   - Implement automatic cleanup of old avatars
   - Monitor storage usage in DO dashboard

3. **Bandwidth Optimization**:
   - Use CDN (included free) to reduce bandwidth costs
   - Implement proper caching headers
   - Consider image lazy loading

### Example Monthly Costs

For a typical application:

- **Small App** (< 1000 users): ~$5-10/month
- **Medium App** (< 10,000 users): ~$10-25/month
- **Large App** (> 10,000 users): ~$25-50/month

## Next Steps

After completing this setup:

1. **Test thoroughly** in development environment
2. **Create production Space** with separate keys
3. **Set up monitoring** for storage usage
4. **Implement backup strategy** if needed
5. **Document your specific configuration** for team members

## Support

If you encounter issues:

1. Check the [DigitalOcean Spaces Documentation](https://docs.digitalocean.com/products/spaces/)
2. Review application logs for detailed error messages
3. Test with the DigitalOcean API directly using curl
4. Contact DigitalOcean support for infrastructure issues

---

## Quick Reference

### Essential Environment Variables

```bash
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_KEY=your_key_here
DO_SPACES_SECRET=your_secret_here
DO_SPACES_BUCKET=your-bucket-name
DO_SPACES_REGION=nyc3
DO_SPACES_CDN_URL=https://bucket.region.cdn.digitaloceanspaces.com
```

### Common Endpoints by Region

- **New York 3**: `https://nyc3.digitaloceanspaces.com`
- **San Francisco 3**: `https://sfo3.digitaloceanspaces.com`
- **Amsterdam 3**: `https://ams3.digitaloceanspaces.com`
- **Singapore 1**: `https://sgp1.digitaloceanspaces.com`

### File Upload Limits

- **Max File Size**: 5MB
- **Allowed Types**: JPEG, PNG, GIF, WebP
- **Naming**: Auto-generated unique names
- **Path Structure**: `avatars/{userId}/{timestamp}-{random}.{ext}`

---

_This documentation is maintained as part of the NodeAngularFullStack project. Last updated:
2025-01-XX_
