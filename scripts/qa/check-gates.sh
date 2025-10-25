#!/bin/bash

##############################################################################
# Gate File Checker
#
# Scans all quality gate files and reports on quality metrics.
# Can be used for manual checks or integrated into CI/CD pipelines.
#
# Usage:
#   ./scripts/qa/check-gates.sh                  # Check all gates
#   ./scripts/qa/check-gates.sh --story 31.2.4   # Check specific story
#   ./scripts/qa/check-gates.sh --fail-on-fail   # Exit 1 if any FAIL gates
#   ./scripts/qa/check-gates.sh --summary        # Show summary only
#
# Exit codes:
#   0 - All gates PASS (or no --fail-on-fail flag)
#   1 - One or more gates FAIL (when --fail-on-fail used)
#   2 - No gate files found
##############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Configuration
GATES_DIR="docs/qa/gates"
FAIL_ON_FAIL=false
SPECIFIC_STORY=""
SUMMARY_ONLY=false

# Counters
TOTAL_GATES=0
PASS_COUNT=0
CONCERNS_COUNT=0
FAIL_COUNT=0
WAIVED_COUNT=0

##############################################################################
# Parse command-line arguments
##############################################################################
while [[ $# -gt 0 ]]; do
  case $1 in
    --fail-on-fail)
      FAIL_ON_FAIL=true
      shift
      ;;
    --story)
      SPECIFIC_STORY="$2"
      shift 2
      ;;
    --summary)
      SUMMARY_ONLY=true
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --fail-on-fail    Exit with code 1 if any gates are FAIL"
      echo "  --story <id>      Check only specific story (e.g., 31.2.4)"
      echo "  --summary         Show summary statistics only"
      echo "  --help            Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

##############################################################################
# Check if gates directory exists
##############################################################################
if [[ ! -d "$GATES_DIR" ]]; then
  echo -e "${RED}✗ Gates directory not found: $GATES_DIR${NC}"
  exit 2
fi

##############################################################################
# Find gate files
##############################################################################
if [[ -n "$SPECIFIC_STORY" ]]; then
  GATE_FILES=$(find "$GATES_DIR" -name "${SPECIFIC_STORY}*.yml" 2>/dev/null || true)
else
  GATE_FILES=$(find "$GATES_DIR" -name "*.yml" 2>/dev/null || true)
fi

if [[ -z "$GATE_FILES" ]]; then
  echo -e "${YELLOW}⚠ No gate files found${NC}"
  exit 2
fi

##############################################################################
# Function to extract YAML field value
##############################################################################
extract_field() {
  local file="$1"
  local field="$2"
  grep "^${field}:" "$file" | sed "s/^${field}: //" | tr -d '"' || echo "N/A"
}

##############################################################################
# Function to extract NFR status
##############################################################################
extract_nfr_status() {
  local file="$1"
  local nfr="$2"

  # Check if nfr_validation section exists
  if ! grep -q "^nfr_validation:" "$file" 2>/dev/null; then
    echo "N/A"
    return
  fi

  # Extract status using awk for more robust parsing
  awk -v nfr="$nfr" '
    /^nfr_validation:/ { in_nfr=1; next }
    in_nfr && $0 ~ "^[a-z]" && $0 !~ "^  " { in_nfr=0 }
    in_nfr && $0 ~ "^  " nfr ":" { in_section=1; next }
    in_section && /status:/ {
      sub(/.*status: */, "");
      gsub(/[",]/, "");
      print;
      exit
    }
    in_section && $0 ~ "^  [a-z]" { in_section=0 }
  ' "$file" || echo "N/A"
}

##############################################################################
# Function to count top issues by severity
##############################################################################
count_issues_by_severity() {
  local file="$1"
  local severity="$2"

  # Count matches and ensure we return a single integer
  local count=$(grep "severity: ${severity}" "$file" 2>/dev/null | wc -l | tr -d ' ')

  # Ensure count is a valid integer (handle empty or malformed results)
  if [[ "$count" =~ ^[0-9]+$ ]]; then
    echo "$count"
  else
    echo "0"
  fi
}

##############################################################################
# Print header
##############################################################################
if [[ "$SUMMARY_ONLY" == false ]]; then
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                  Quality Gate Status Report                   ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
fi

##############################################################################
# Process each gate file
##############################################################################
while IFS= read -r gate_file; do
  [[ -z "$gate_file" ]] && continue

  TOTAL_GATES=$((TOTAL_GATES + 1))

  # Extract key fields
  STORY=$(extract_field "$gate_file" "story")
  TITLE=$(extract_field "$gate_file" "story_title")
  GATE=$(extract_field "$gate_file" "gate")
  QUALITY_SCORE=$(extract_field "$gate_file" "quality_score")
  REVIEWER=$(extract_field "$gate_file" "reviewer")
  UPDATED=$(extract_field "$gate_file" "updated")
  WAIVER_ACTIVE=$(grep "active:" "$gate_file" | head -1 | awk '{print $2}')

  # Count issues
  HIGH_ISSUES=$(count_issues_by_severity "$gate_file" "high")
  MEDIUM_ISSUES=$(count_issues_by_severity "$gate_file" "medium")
  LOW_ISSUES=$(count_issues_by_severity "$gate_file" "low")

  # Extract NFR statuses
  SEC_STATUS=$(extract_nfr_status "$gate_file" "security")
  PERF_STATUS=$(extract_nfr_status "$gate_file" "performance")
  REL_STATUS=$(extract_nfr_status "$gate_file" "reliability")
  MAINT_STATUS=$(extract_nfr_status "$gate_file" "maintainability")

  # Update counters
  case "$GATE" in
    PASS)
      PASS_COUNT=$((PASS_COUNT + 1))
      GATE_COLOR=$GREEN
      GATE_ICON="✓"
      ;;
    CONCERNS)
      CONCERNS_COUNT=$((CONCERNS_COUNT + 1))
      GATE_COLOR=$YELLOW
      GATE_ICON="⚠"
      ;;
    FAIL)
      FAIL_COUNT=$((FAIL_COUNT + 1))
      GATE_COLOR=$RED
      GATE_ICON="✗"
      ;;
    WAIVED)
      WAIVED_COUNT=$((WAIVED_COUNT + 1))
      GATE_COLOR=$BLUE
      GATE_ICON="⊘"
      ;;
    *)
      GATE_COLOR=$GRAY
      GATE_ICON="?"
      ;;
  esac

  if [[ "$SUMMARY_ONLY" == false ]]; then
    # Print detailed gate info
    echo -e "${GATE_COLOR}${GATE_ICON} Story ${STORY}: ${TITLE}${NC}"
    echo -e "  ${GRAY}Gate:${NC} ${GATE_COLOR}${GATE}${NC} | ${GRAY}Score:${NC} ${QUALITY_SCORE}/100"

    if [[ "$WAIVER_ACTIVE" == "true" ]]; then
      echo -e "  ${BLUE}⊘ WAIVED${NC}"
    fi

    # Issue summary
    if [[ $((HIGH_ISSUES + MEDIUM_ISSUES + LOW_ISSUES)) -gt 0 ]]; then
      echo -e "  ${GRAY}Issues:${NC} ${RED}${HIGH_ISSUES} high${NC}, ${YELLOW}${MEDIUM_ISSUES} medium${NC}, ${GRAY}${LOW_ISSUES} low${NC}"
    else
      echo -e "  ${GRAY}Issues:${NC} ${GREEN}None${NC}"
    fi

    # NFR Status
    echo -e "  ${GRAY}NFR:${NC} Security=${SEC_STATUS} Performance=${PERF_STATUS} Reliability=${REL_STATUS} Maintainability=${MAINT_STATUS}"

    echo -e "  ${GRAY}Reviewed:${NC} ${UPDATED} by ${REVIEWER}"
    echo -e "  ${GRAY}File:${NC} $gate_file"
    echo ""
  fi
done <<< "$GATE_FILES"

##############################################################################
# Print summary
##############################################################################
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                         Summary                                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GRAY}Total Gates:${NC} $TOTAL_GATES"
echo -e "  ${GREEN}✓ PASS:${NC}      $PASS_COUNT"
echo -e "  ${YELLOW}⚠ CONCERNS:${NC}  $CONCERNS_COUNT"
echo -e "  ${RED}✗ FAIL:${NC}      $FAIL_COUNT"
echo -e "  ${BLUE}⊘ WAIVED:${NC}    $WAIVED_COUNT"
echo ""

# Calculate pass rate
if [[ $TOTAL_GATES -gt 0 ]]; then
  # Ensure variables are valid integers before arithmetic
  pass_count_safe=${PASS_COUNT:-0}
  total_gates_safe=${TOTAL_GATES:-1}

  PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($pass_count_safe / $total_gates_safe) * 100}")
  echo -e "  ${GRAY}Pass Rate:${NC} ${PASS_RATE}% (excluding WAIVED)"
  echo ""
fi

##############################################################################
# Determine exit status
##############################################################################
if [[ "$FAIL_ON_FAIL" == true ]] && [[ $FAIL_COUNT -gt 0 ]]; then
  echo -e "${RED}✗ CI/CD Check Failed: ${FAIL_COUNT} gate(s) have FAIL status${NC}"
  echo ""
  exit 1
fi

if [[ $FAIL_COUNT -gt 0 ]]; then
  echo -e "${YELLOW}⚠ Warning: ${FAIL_COUNT} gate(s) have FAIL status${NC}"
  echo -e "${GRAY}  (Use --fail-on-fail to block CI/CD on failures)${NC}"
  echo ""
fi

if [[ $TOTAL_GATES -eq $PASS_COUNT ]]; then
  echo -e "${GREEN}✓ All gates PASS - Ready for deployment${NC}"
  echo ""
fi

exit 0
