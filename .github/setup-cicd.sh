#!/bin/bash
################################################################################
# CI/CD Setup Helper Script
#
# This script helps you set up GitHub Actions deployment to DigitalOcean.
# It generates SSH keys and provides instructions for GitHub Secrets setup.
#
# Usage: ./setup-cicd.sh
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}🚀 CI/CD Setup Helper for DigitalOcean Deployment${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Generate SSH key
echo -e "${BLUE}Step 1: Generating SSH key for GitHub Actions${NC}"
echo ""

SSH_KEY_PATH="$HOME/.ssh/github_actions_deploy"

if [ -f "$SSH_KEY_PATH" ]; then
  echo -e "${YELLOW}⚠️  SSH key already exists at $SSH_KEY_PATH${NC}"
  read -p "Overwrite? (y/n): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Using existing key..."
  else
    rm -f "$SSH_KEY_PATH" "$SSH_KEY_PATH.pub"
    ssh-keygen -t ed25519 -C "github-actions-deploy" -f "$SSH_KEY_PATH" -N ""
    echo -e "${GREEN}✓ New SSH key generated${NC}"
  fi
else
  ssh-keygen -t ed25519 -C "github-actions-deploy" -f "$SSH_KEY_PATH" -N ""
  echo -e "${GREEN}✓ SSH key generated${NC}"
fi

echo ""

# Step 2: Display public key
echo -e "${BLUE}Step 2: Add public key to your DigitalOcean server${NC}"
echo ""
echo "Public key to add to server's ~/.ssh/authorized_keys:"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
cat "$SSH_KEY_PATH.pub"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Ask for server details
read -p "Enter your server IP address: " SERVER_IP
read -p "Enter your server username (e.g., root): " SERVER_USER
read -p "Enter your server SSH port (default 22): " SERVER_PORT
SERVER_PORT=${SERVER_PORT:-22}

echo ""
echo -e "${YELLOW}Copying public key to server...${NC}"

if ssh-copy-id -i "$SSH_KEY_PATH.pub" -p "$SERVER_PORT" "$SERVER_USER@$SERVER_IP"; then
  echo -e "${GREEN}✓ Public key copied to server${NC}"
else
  echo -e "${RED}✗ Failed to copy key automatically${NC}"
  echo ""
  echo "Please manually add the public key to your server:"
  echo "1. SSH to your server: ssh $SERVER_USER@$SERVER_IP"
  echo "2. Edit authorized_keys: nano ~/.ssh/authorized_keys"
  echo "3. Paste the public key shown above"
  echo "4. Save and exit"
fi

echo ""

# Step 3: Test SSH connection
echo -e "${BLUE}Step 3: Testing SSH connection${NC}"
echo ""

if ssh -i "$SSH_KEY_PATH" -p "$SERVER_PORT" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "echo 'Connection successful'" 2>/dev/null; then
  echo -e "${GREEN}✓ SSH connection successful${NC}"
else
  echo -e "${RED}✗ SSH connection failed${NC}"
  echo "Please verify the public key is added to server's authorized_keys"
fi

echo ""

# Step 4: Display GitHub Secrets
echo -e "${BLUE}Step 4: Add the following secrets to GitHub${NC}"
echo ""
echo "Go to: Repository → Settings → Secrets and variables → Actions"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}Secret 1: SSH_PRIVATE_KEY${NC}"
echo "Copy the private key below (including BEGIN/END lines):"
echo ""
cat "$SSH_KEY_PATH"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}Secret 2: SSH_HOST${NC}"
echo "Value: $SERVER_IP"
echo ""
echo -e "${GREEN}Secret 3: SSH_USER${NC}"
echo "Value: $SERVER_USER"
echo ""
if [ "$SERVER_PORT" != "22" ]; then
  echo -e "${GREEN}Secret 4: SSH_PORT${NC}"
  echo "Value: $SERVER_PORT"
  echo ""
fi
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 5: Verify server setup
echo -e "${BLUE}Step 5: Verify server is ready for deployment${NC}"
echo ""
echo "Make sure the following are set up on your server:"
echo "  ✓ Node.js 18+ installed"
echo "  ✓ PM2 installed globally (npm install -g pm2)"
echo "  ✓ PostgreSQL running"
echo "  ✓ Nginx installed and configured"
echo "  ✓ Project cloned at /var/apps/NodeAngularFullStack"
echo "  ✓ Environment variables configured (.env.production)"
echo ""

read -p "Verify server setup now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo "Connecting to server..."
  ssh -i "$SSH_KEY_PATH" -p "$SERVER_PORT" "$SERVER_USER@$SERVER_IP" << 'EOF'
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Server Environment Check:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Check Node.js
    if command -v node &> /dev/null; then
      echo "✓ Node.js: $(node --version)"
    else
      echo "✗ Node.js: Not installed"
    fi

    # Check npm
    if command -v npm &> /dev/null; then
      echo "✓ npm: $(npm --version)"
    else
      echo "✗ npm: Not installed"
    fi

    # Check PM2
    if command -v pm2 &> /dev/null; then
      echo "✓ PM2: $(pm2 --version)"
    else
      echo "✗ PM2: Not installed"
    fi

    # Check PostgreSQL
    if command -v psql &> /dev/null; then
      if pg_isready &> /dev/null; then
        echo "✓ PostgreSQL: Running"
      else
        echo "⚠ PostgreSQL: Installed but not running"
      fi
    else
      echo "✗ PostgreSQL: Not installed"
    fi

    # Check Nginx
    if command -v nginx &> /dev/null; then
      echo "✓ Nginx: $(nginx -v 2>&1 | grep -o 'nginx/[0-9.]*')"
    else
      echo "✗ Nginx: Not installed"
    fi

    # Check project directory
    if [ -d "/var/apps/NodeAngularFullStack" ]; then
      echo "✓ Project directory exists"
      cd /var/apps/NodeAngularFullStack
      if [ -f "deploy.sh" ]; then
        echo "✓ deploy.sh found"
      else
        echo "✗ deploy.sh not found"
      fi
    else
      echo "✗ Project directory not found at /var/apps/NodeAngularFullStack"
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
EOF
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ CI/CD setup helper completed!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Next steps:"
echo "  1. Add the GitHub Secrets shown above to your repository"
echo "  2. Push code to main branch to trigger deployment"
echo "  3. Monitor deployment in GitHub Actions tab"
echo ""
echo "For detailed instructions, see: .github/CICD-SETUP.md"
echo ""
