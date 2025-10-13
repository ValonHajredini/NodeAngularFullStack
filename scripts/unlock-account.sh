#!/bin/bash
#
# Development utility to unlock user accounts that have been locked
# due to failed login attempts.
#
# Usage:
#   ./scripts/unlock-account.sh                    # Unlock all test accounts
#   ./scripts/unlock-account.sh admin@example.com  # Unlock specific account
#

API_URL="${API_URL:-http://localhost:3000}"
EMAIL="${1:-}"

if [ -z "$EMAIL" ]; then
  echo "🔓 Unlocking all test accounts..."

  for email in "admin@example.com" "user@example.com" "readonly@example.com"; do
    response=$(curl -s -X POST "$API_URL/api/v1/auth/dev/unlock-account" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$email\"}")

    message=$(echo "$response" | jq -r '.message' 2>/dev/null || echo "Error")
    wasLocked=$(echo "$response" | jq -r '.data.wasLocked' 2>/dev/null || echo "unknown")

    if [ "$message" = "Account unlocked successfully" ]; then
      if [ "$wasLocked" = "true" ]; then
        echo "✅ Unlocked: $email (was locked)"
      else
        echo "ℹ️  $email (was not locked)"
      fi
    else
      echo "❌ Failed to unlock: $email"
      echo "   Error: $message"
    fi
  done

  echo ""
  echo "✨ Done!"
else
  echo "🔓 Unlocking account: $EMAIL"

  response=$(curl -s -X POST "$API_URL/api/v1/auth/dev/unlock-account" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\"}")

  message=$(echo "$response" | jq -r '.message' 2>/dev/null || echo "Error")
  wasLocked=$(echo "$response" | jq -r '.data.wasLocked' 2>/dev/null || echo "unknown")
  previousAttempts=$(echo "$response" | jq -r '.data.previousAttempts' 2>/dev/null || echo "0")

  if [ "$message" = "Account unlocked successfully" ]; then
    echo "✅ Account unlocked successfully!"
    echo "   Email: $EMAIL"
    echo "   Was locked: $wasLocked"
    echo "   Previous failed attempts: $previousAttempts"
  else
    echo "❌ Failed to unlock account"
    echo "   Error: $message"
    exit 1
  fi
fi
