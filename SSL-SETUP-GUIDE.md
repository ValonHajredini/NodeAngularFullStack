# SSL Certificate Setup Guide

## Problem: ERR_CERT_COMMON_NAME_INVALID

This error occurs when the SSL certificate doesn't match the domain being accessed.

## Solution: Setup Let's Encrypt SSL Certificates

### Prerequisites

- Root/sudo access to production server
- Nginx installed and running
- DNS records pointing to server:
  - `legopdf.com` → Server IP
  - `www.legopdf.com` → Server IP
  - `api.legopdf.com` → Server IP
  - `forms-api.legopdf.com` → Server IP
  - `form-builder.legopdf.com` → Server IP

### Step 1: Install Certbot

```bash
# SSH into production server
ssh $PROD_SSH_USER@$PROD_SSH_HOST

# Update package lists
sudo apt update

# Install certbot with nginx plugin
sudo apt install certbot python3-certbot-nginx -y

# Verify installation
certbot --version
```

### Step 2: Verify DNS Resolution

Before requesting certificates, ensure DNS is propagated:

```bash
# Check DNS resolution
nslookup legopdf.com
nslookup api.legopdf.com
nslookup forms-api.legopdf.com
nslookup form-builder.legopdf.com

# OR use dig
dig legopdf.com +short
dig api.legopdf.com +short
dig forms-api.legopdf.com +short
dig form-builder.legopdf.com +short
```

All domains should resolve to your server's public IP address.

### Step 3: Copy Nginx Configurations to Server

```bash
# On production server, create nginx config directory
sudo mkdir -p /etc/nginx/sites-available
sudo mkdir -p /etc/nginx/sites-enabled

# Copy nginx configs (from local machine or git repo)
# Option 1: Via rsync (from local machine)
rsync -avz nginx/*.conf $PROD_SSH_USER@$PROD_SSH_HOST:/tmp/

# Option 2: Via git (on server)
cd /var/apps/NodeAngularFullStack
git pull origin production

# Move configs to nginx directory
sudo cp /var/apps/NodeAngularFullStack/nginx/web.legopdf.com.conf /etc/nginx/sites-available/
sudo cp /var/apps/NodeAngularFullStack/nginx/api.legopdf.com.conf /etc/nginx/sites-available/
sudo cp /var/apps/NodeAngularFullStack/nginx/forms-api.legopdf.com.conf /etc/nginx/sites-available/
sudo cp /var/apps/NodeAngularFullStack/nginx/form-builder.legopdf.com.conf /etc/nginx/sites-available/

# Create symbolic links
sudo ln -sf /etc/nginx/sites-available/web.legopdf.com.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/api.legopdf.com.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/forms-api.legopdf.com.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/form-builder.legopdf.com.conf /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

### Step 4: Generate SSL Certificates

**Option A: Generate All Certificates at Once (Recommended)**

```bash
sudo certbot --nginx \
  -d legopdf.com \
  -d www.legopdf.com \
  -d api.legopdf.com \
  -d forms-api.legopdf.com \
  -d form-builder.legopdf.com
```

**Option B: Generate Separately for Each Domain**

```bash
# Main domain
sudo certbot --nginx -d legopdf.com -d www.legopdf.com

# API domain
sudo certbot --nginx -d api.legopdf.com

# Forms API domain
sudo certbot --nginx -d forms-api.legopdf.com

# Form Builder domain
sudo certbot --nginx -d form-builder.legopdf.com
```

**During Certificate Generation:**

1. **Email Address**: Enter your email for renewal notifications
2. **Terms of Service**: Press `A` to agree
3. **Redirect HTTP to HTTPS**: Press `2` (recommended) to always redirect

### Step 5: Verify Certificate Installation

```bash
# Check if certificates were created
sudo ls -la /etc/letsencrypt/live/legopdf.com/
sudo ls -la /etc/letsencrypt/live/api.legopdf.com/
sudo ls -la /etc/letsencrypt/live/forms-api.legopdf.com/
sudo ls -la /etc/letsencrypt/live/form-builder.legopdf.com/

# Expected output for each:
# fullchain.pem -> ../../archive/domain.com/fullchain1.pem
# privkey.pem -> ../../archive/domain.com/privkey1.pem
# chain.pem -> ../../archive/domain.com/chain1.pem
# cert.pem -> ../../archive/domain.com/cert1.pem
```

### Step 6: Test SSL Configuration

```bash
# Test nginx configuration
sudo nginx -t

# Expected output:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Reload nginx to apply changes
sudo systemctl reload nginx
```

### Step 7: Verify HTTPS Works

**Test from command line:**

```bash
# Test main domain
curl -I https://legopdf.com

# Test API domain
curl -I https://api.legopdf.com/health

# Test Forms API domain
curl -I https://forms-api.legopdf.com/health

# Test Form Builder domain
curl -I https://form-builder.legopdf.com

# All should return 200 OK without SSL errors
```

**Test from browser:**

1. Visit https://legopdf.com
2. Visit https://api.legopdf.com/api-docs
3. Visit https://forms-api.legopdf.com/api-docs
4. Visit https://form-builder.legopdf.com

All should show a padlock icon 🔒 in the address bar.

### Step 8: Setup Auto-Renewal

Let's Encrypt certificates expire after 90 days. Certbot automatically sets up a renewal cron job.

**Verify auto-renewal is configured:**

```bash
# Check certbot timer
sudo systemctl status certbot.timer

# Test renewal (dry run)
sudo certbot renew --dry-run

# Expected output:
# Congratulations, all simulated renewals succeeded
```

**Manual renewal (if needed):**

```bash
# Renew all certificates
sudo certbot renew

# Renew specific certificate
sudo certbot renew --cert-name legopdf.com

# Reload nginx after renewal
sudo systemctl reload nginx
```

### Step 9: Verify SSL Grade

Test your SSL configuration quality:

```bash
# Visit SSL Labs
# https://www.ssllabs.com/ssltest/analyze.html?d=legopdf.com
# https://www.ssllabs.com/ssltest/analyze.html?d=api.legopdf.com

# Expected grade: A or A+
```

## Troubleshooting

### Issue: "Certificate verification failed"

**Cause**: DNS not propagated or pointing to wrong IP

**Solution**:

```bash
# Wait 5-10 minutes for DNS propagation
# Verify DNS with:
dig legopdf.com +short
```

### Issue: "Port 80 not accessible"

**Cause**: Firewall blocking HTTP

**Solution**:

```bash
# Allow HTTP and HTTPS through firewall
sudo ufw allow 'Nginx Full'
sudo ufw status
```

### Issue: "nginx: [emerg] cannot load certificate"

**Cause**: Certificate files not accessible

**Solution**:

```bash
# Check file permissions
sudo ls -la /etc/letsencrypt/live/legopdf.com/

# Fix permissions if needed
sudo chown -R root:root /etc/letsencrypt
sudo chmod -R 755 /etc/letsencrypt
```

### Issue: Certificate exists but browser shows error

**Cause**: Nginx not reloaded or wrong certificate path

**Solution**:

```bash
# Check nginx error log
sudo tail -f /var/log/nginx/error.log

# Reload nginx
sudo systemctl reload nginx

# Verify certificate path in nginx config
sudo nginx -T | grep ssl_certificate
```

## Certificate Locations

```
/etc/letsencrypt/
├── live/
│   ├── legopdf.com/
│   │   ├── fullchain.pem
│   │   ├── privkey.pem
│   │   ├── chain.pem
│   │   └── cert.pem
│   ├── api.legopdf.com/
│   │   └── [same files]
│   ├── forms-api.legopdf.com/
│   │   └── [same files]
│   └── form-builder.legopdf.com/
│       └── [same files]
├── renewal/
│   └── [renewal configs]
└── archive/
    └── [certificate backups]
```

## Nginx SSL Configuration (Already Applied)

All nginx configs now reference the correct certificate paths:

```nginx
# api.legopdf.com
ssl_certificate /etc/letsencrypt/live/api.legopdf.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/api.legopdf.com/privkey.pem;
ssl_trusted_certificate /etc/letsencrypt/live/api.legopdf.com/chain.pem;

# forms-api.legopdf.com
ssl_certificate /etc/letsencrypt/live/forms-api.legopdf.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/forms-api.legopdf.com/privkey.pem;
ssl_trusted_certificate /etc/letsencrypt/live/forms-api.legopdf.com/chain.pem;

# legopdf.com
ssl_certificate /etc/letsencrypt/live/legopdf.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/legopdf.com/privkey.pem;
ssl_trusted_certificate /etc/letsencrypt/live/legopdf.com/chain.pem;

# form-builder.legopdf.com
ssl_certificate /etc/letsencrypt/live/form-builder.legopdf.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/form-builder.legopdf.com/privkey.pem;
ssl_trusted_certificate /etc/letsencrypt/live/form-builder.legopdf.com/chain.pem;
```

## Summary

✅ SSL certificates configured for all 4 domains ✅ Nginx configs updated with correct certificate
paths ✅ Auto-renewal enabled (certificates renew automatically) ✅ HTTPS enforced (HTTP redirects
to HTTPS)

After running the certbot commands above, the `ERR_CERT_COMMON_NAME_INVALID` error will be resolved!
🔒
