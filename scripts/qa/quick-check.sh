#!/bin/bash

##############################################################################
# Quick Gate Check
#
# Ultra-fast gate status check for a single story.
# Perfect for developer workflow to quickly check review status.
#
# Usage:
#   ./scripts/qa/quick-check.sh 31.2.4
#   ./scripts/qa/quick-check.sh             # Uses most recent gate file
##############################################################################

set -euo pipefail

GATES_DIR="docs/qa/gates"
STORY_ID="$1"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
GRAY='\033[0;90m'
NC='\033[0m'

# If no story ID provided, use most recent gate file
if [[ -z "${STORY_ID:-}" ]]; then
  LATEST_GATE=$(ls -t "$GATES_DIR"/*.yml 2>/dev/null | head -1)
  if [[ -z "$LATEST_GATE" ]]; then
    echo -e "${RED}✗ No gate files found${NC}"
    exit 1
  fi
  STORY_ID=$(basename "$LATEST_GATE" .yml | cut -d'-' -f1)
  echo -e "${GRAY}Using most recent gate: ${STORY_ID}${NC}\n"
fi

# Find gate file for story
GATE_FILE=$(find "$GATES_DIR" -name "${STORY_ID}*.yml" 2>/dev/null | head -1)

if [[ -z "$GATE_FILE" ]]; then
  echo -e "${RED}✗ No gate file found for story ${STORY_ID}${NC}"
  echo -e "${GRAY}Available stories:${NC}"
  ls "$GATES_DIR" | sed 's/\.yml//' | sed 's/^/  /'
  exit 1
fi

# Extract key info
GATE=$(grep "^gate:" "$GATE_FILE" | sed 's/^gate: //' | tr -d '"')
SCORE=$(grep "^quality_score:" "$GATE_FILE" | sed 's/^quality_score: //' || echo "N/A")
TITLE=$(grep "^story_title:" "$GATE_FILE" | sed 's/^story_title: //' | tr -d '"')
REVIEWER=$(grep "^reviewer:" "$GATE_FILE" | sed 's/^reviewer: //' | tr -d '"')

# Count issues (ensure single integers)
HIGH=$(grep "severity: high" "$GATE_FILE" 2>/dev/null | wc -l | tr -d ' ' || echo "0")
MEDIUM=$(grep "severity: medium" "$GATE_FILE" 2>/dev/null | wc -l | tr -d ' ' || echo "0")
LOW=$(grep "severity: low" "$GATE_FILE" 2>/dev/null | wc -l | tr -d ' ' || echo "0")

# Validate counts are integers
[[ ! "$HIGH" =~ ^[0-9]+$ ]] && HIGH=0
[[ ! "$MEDIUM" =~ ^[0-9]+$ ]] && MEDIUM=0
[[ ! "$LOW" =~ ^[0-9]+$ ]] && LOW=0

# Determine color
case "$GATE" in
  PASS) COLOR=$GREEN; ICON="✓" ;;
  CONCERNS) COLOR=$YELLOW; ICON="⚠" ;;
  FAIL) COLOR=$RED; ICON="✗" ;;
  WAIVED) COLOR=$BLUE; ICON="⊘" ;;
  *) COLOR=$GRAY; ICON="?" ;;
esac

# Print result
echo ""
echo -e "${COLOR}${ICON} Story ${STORY_ID}: ${TITLE}${NC}"
echo -e "${COLOR}   Gate Status: ${GATE}${NC}"
echo -e "   Quality Score: ${SCORE}/100"

if [[ $((HIGH + MEDIUM + LOW)) -gt 0 ]]; then
  echo -e "   Issues: ${RED}${HIGH} high${NC}, ${YELLOW}${MEDIUM} medium${NC}, ${GRAY}${LOW} low${NC}"
fi

echo -e "   Reviewed by: ${REVIEWER}"
echo ""

# Show first 3 high-severity issues
if [[ $HIGH -gt 0 ]]; then
  echo -e "${RED}High-Priority Issues:${NC}"
  grep -A 5 'severity: high' "$GATE_FILE" | grep 'finding:' | sed 's/.*finding: //' | tr -d '"' | head -3 | sed 's/^/  • /'
  echo ""
fi

# Action items
if [[ "$GATE" == "FAIL" ]]; then
  echo -e "${RED}⚠ Action Required:${NC}"
  echo -e "   1. Review gate file: ${GATE_FILE}"
  echo -e "   2. Address high-severity issues"
  echo -e "   3. Request re-review: ${BLUE}*review ${STORY_ID}${NC}"
  echo ""
elif [[ "$GATE" == "CONCERNS" ]]; then
  echo -e "${YELLOW}⚠ Recommendations:${NC}"
  echo -e "   Review gate file for improvement suggestions"
  echo -e "   ${GATE_FILE}"
  echo ""
elif [[ "$GATE" == "PASS" ]]; then
  echo -e "${GREEN}✓ Ready for deployment${NC}"
  echo ""
fi

# Exit with status
[[ "$GATE" == "PASS" ]] && exit 0 || exit 1
