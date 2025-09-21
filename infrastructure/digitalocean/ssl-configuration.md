# SSL/TLS Configuration for Digital Ocean Deployment

## Overview

This document covers SSL/TLS configuration for production deployment on Digital Ocean App Platform.

## Digital Ocean App Platform SSL

### Automatic SSL/TLS

Digital Ocean App Platform automatically provides SSL/TLS certificates for:

- Default ondigitalocean.app domains
- Custom domains (with DNS verification)

### Default Domain SSL

For domains like `nodeangularfullstack-web.ondigitalocean.app`:

- SSL certificate is automatically provisioned
- Certificate is automatically renewed
- HTTPS is enforced by default

## Custom Domain SSL Configuration

### 1. Domain Setup

1. **Add Custom Domain** in Digital Ocean App Platform:

   ```
   Primary Domain: your-domain.com
   API Subdomain: api.your-domain.com
   ```

2. **DNS Configuration**:
   ```
   A Record: your-domain.com → [App Platform IP]
   CNAME: api.your-domain.com → your-domain.com
   CNAME: www.your-domain.com → your-domain.com
   ```

### 2. SSL Certificate Provisioning

Digital Ocean automatically provisions Let's Encrypt certificates:

- **Automatic Renewal**: Certificates auto-renew 30 days before expiration
- **Wildcard Support**: Available for \*.your-domain.com
- **Multi-Domain**: Single certificate can cover multiple subdomains

### 3. Custom SSL Certificate (Optional)

For enterprise customers who need custom certificates:

1. **Upload Certificate** via Digital Ocean API:

   ```bash
   curl -X POST "https://api.digitalocean.com/v2/certificates" \
     -H "Authorization: Bearer $DO_API_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "nodeangularfullstack-ssl",
       "type": "custom",
       "private_key": "-----BEGIN PRIVATE KEY-----...",
       "leaf_certificate": "-----BEGIN CERTIFICATE-----...",
       "certificate_chain": "-----BEGIN CERTIFICATE-----..."
     }'
   ```

2. **Assign to App**:
   ```bash
   curl -X PUT "https://api.digitalocean.com/v2/apps/$APP_ID" \
     -H "Authorization: Bearer $DO_API_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "domains": [{
         "domain": "your-domain.com",
         "type": "PRIMARY",
         "certificate_id": "$CERTIFICATE_ID"
       }]
     }'
   ```

## SSL Security Configuration

### 1. HSTS (HTTP Strict Transport Security)

Already configured in nginx.conf and security middleware:

```nginx
# nginx.conf
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

```typescript
// security.middleware.ts
hsts: {
  maxAge: 31536000, // 1 year
  includeSubDomains: true,
  preload: true
}
```

### 2. HTTPS Redirect

Digital Ocean App Platform automatically redirects HTTP to HTTPS.

For additional protection in Express.js:

```typescript
// Force HTTPS in production
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

### 3. Secure Cookies

Configure secure cookie settings:

```typescript
app.use(
  session({
    cookie: {
      secure: true, // HTTPS only
      httpOnly: true, // Prevent XSS
      sameSite: 'strict', // CSRF protection
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);
```

## SSL Testing and Validation

### 1. SSL Labs Test

Test SSL configuration:

```bash
# Online tool
https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com

# Command line
nmap --script ssl-enum-ciphers -p 443 your-domain.com
```

### 2. Certificate Validation

```bash
# Check certificate details
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Check certificate expiration
echo | openssl s_client -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
```

### 3. Security Headers Test

```bash
# Test security headers
curl -I https://your-domain.com

# Online security test
https://securityheaders.com/?q=your-domain.com
```

## Certificate Monitoring

### 1. Automated Monitoring Script

```bash
#!/bin/bash
# scripts/check-ssl-cert.sh

DOMAIN="your-domain.com"
THRESHOLD=30  # Days before expiration

# Get certificate expiration date
EXPIRY=$(echo | openssl s_client -connect $DOMAIN:443 -servername $DOMAIN 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
EXPIRY_DATE=$(date -d "$EXPIRY" +%s)
CURRENT_DATE=$(date +%s)
DAYS_LEFT=$(( ($EXPIRY_DATE - $CURRENT_DATE) / 86400 ))

if [ $DAYS_LEFT -lt $THRESHOLD ]; then
  echo "WARNING: SSL certificate for $DOMAIN expires in $DAYS_LEFT days"
  # Send alert notification
fi
```

### 2. Monitoring Integration

Set up monitoring with Sentry or custom alerts:

```typescript
// Certificate monitoring in health check
export const checkSSLCertificate = async (domain: string) => {
  try {
    const response = await fetch(`https://${domain}`, { method: 'HEAD' });
    return {
      status: 'valid',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'invalid',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};
```

## Troubleshooting SSL Issues

### 1. Common Issues

- **DNS Propagation**: Wait 24-48 hours for DNS changes
- **Domain Verification**: Ensure domain ownership verification is complete
- **Mixed Content**: Ensure all resources load over HTTPS

### 2. Debug Commands

```bash
# Check DNS resolution
dig your-domain.com

# Check certificate chain
openssl s_client -connect your-domain.com:443 -showcerts

# Verify certificate matches domain
openssl s_client -connect your-domain.com:443 -servername your-domain.com | openssl x509 -noout -text
```

### 3. Digital Ocean Support

For SSL issues specific to Digital Ocean:

1. Check App Platform dashboard for certificate status
2. Review domain verification status
3. Contact Digital Ocean support with app ID and domain details

## Security Best Practices

### 1. Certificate Security

- Use strong key sizes (2048-bit RSA minimum, 256-bit ECC preferred)
- Implement Certificate Transparency monitoring
- Use OCSP stapling for faster validation

### 2. SSL/TLS Configuration

- Disable SSLv2, SSLv3, and TLS 1.0/1.1
- Use strong cipher suites only
- Implement perfect forward secrecy

### 3. Application Security

- Never expose private keys in code or logs
- Use environment variables for sensitive SSL configuration
- Implement certificate pinning for mobile apps

## Compliance Requirements

### 1. PCI DSS

If handling payment data:

- TLS 1.2 minimum (TLS 1.3 preferred)
- Strong cryptography requirements
- Regular SSL/TLS vulnerability scanning

### 2. GDPR/Privacy

- Encrypt data in transit with strong SSL/TLS
- Document SSL/TLS configuration in privacy impact assessments
- Ensure third-party integrations use adequate encryption

### 3. SOC 2

- SSL/TLS configuration documentation
- Certificate management procedures
- Regular security testing and monitoring
