#!/bin/bash

##############################################################################
# NFR (Non-Functional Requirements) Report Generator
#
# Generates a detailed report showing NFR pass rates across all stories.
# Useful for identifying systemic quality issues.
#
# Usage:
#   ./scripts/qa/gate-nfr-report.sh                # Full report
#   ./scripts/qa/gate-nfr-report.sh --csv          # CSV output for spreadsheet
#   ./scripts/qa/gate-nfr-report.sh --markdown     # Markdown table output
##############################################################################

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
GRAY='\033[0;90m'
NC='\033[0m'

GATES_DIR="docs/qa/gates"
OUTPUT_FORMAT="text"

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --csv) OUTPUT_FORMAT="csv"; shift ;;
    --markdown) OUTPUT_FORMAT="markdown"; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Counters
TOTAL_STORIES=0
SEC_PASS=0
SEC_CONCERNS=0
SEC_FAIL=0
PERF_PASS=0
PERF_CONCERNS=0
PERF_FAIL=0
REL_PASS=0
REL_CONCERNS=0
REL_FAIL=0
MAINT_PASS=0
MAINT_CONCERNS=0
MAINT_FAIL=0

# Extract NFR status (robust YAML parsing)
extract_nfr() {
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

# Process files
if [[ "$OUTPUT_FORMAT" == "csv" ]]; then
  echo "Story,Title,Security,Performance,Reliability,Maintainability,Overall_Pass_Rate"
elif [[ "$OUTPUT_FORMAT" == "markdown" ]]; then
  echo "| Story | Security | Performance | Reliability | Maintainability | Pass Rate |"
  echo "|-------|----------|-------------|-------------|-----------------|-----------|"
fi

for gate_file in "$GATES_DIR"/*.yml; do
  [[ ! -f "$gate_file" ]] && continue

  TOTAL_STORIES=$((TOTAL_STORIES + 1))

  STORY=$(grep "^story:" "$gate_file" | sed 's/^story: //' | tr -d '"')
  TITLE=$(grep "^story_title:" "$gate_file" | sed 's/^story_title: //' | tr -d '"')

  SEC=$(extract_nfr "$gate_file" "security")
  PERF=$(extract_nfr "$gate_file" "performance")
  REL=$(extract_nfr "$gate_file" "reliability")
  MAINT=$(extract_nfr "$gate_file" "maintainability")

  # Count statuses
  [[ "$SEC" == "PASS" ]] && SEC_PASS=$((SEC_PASS + 1))
  [[ "$SEC" == "CONCERNS" ]] && SEC_CONCERNS=$((SEC_CONCERNS + 1))
  [[ "$SEC" == "FAIL" ]] && SEC_FAIL=$((SEC_FAIL + 1))

  [[ "$PERF" == "PASS" ]] && PERF_PASS=$((PERF_PASS + 1))
  [[ "$PERF" == "CONCERNS" ]] && PERF_CONCERNS=$((PERF_CONCERNS + 1))
  [[ "$PERF" == "FAIL" ]] && PERF_FAIL=$((PERF_FAIL + 1))

  [[ "$REL" == "PASS" ]] && REL_PASS=$((REL_PASS + 1))
  [[ "$REL" == "CONCERNS" ]] && REL_CONCERNS=$((REL_CONCERNS + 1))
  [[ "$REL" == "FAIL" ]] && REL_FAIL=$((REL_FAIL + 1))

  [[ "$MAINT" == "PASS" ]] && MAINT_PASS=$((MAINT_PASS + 1))
  [[ "$MAINT" == "CONCERNS" ]] && MAINT_CONCERNS=$((MAINT_CONCERNS + 1))
  [[ "$MAINT" == "FAIL" ]] && MAINT_FAIL=$((MAINT_FAIL + 1))

  # Calculate pass rate for this story
  PASS_COUNT=0
  [[ "$SEC" == "PASS" ]] && PASS_COUNT=$((PASS_COUNT + 1))
  [[ "$PERF" == "PASS" ]] && PASS_COUNT=$((PASS_COUNT + 1))
  [[ "$REL" == "PASS" ]] && PASS_COUNT=$((PASS_COUNT + 1))
  [[ "$MAINT" == "PASS" ]] && PASS_COUNT=$((PASS_COUNT + 1))
  PASS_RATE=$(awk "BEGIN {printf \"%.0f\", ($PASS_COUNT / 4) * 100}")

  if [[ "$OUTPUT_FORMAT" == "csv" ]]; then
    echo "$STORY,\"$TITLE\",$SEC,$PERF,$REL,$MAINT,${PASS_RATE}%"
  elif [[ "$OUTPUT_FORMAT" == "markdown" ]]; then
    echo "| $STORY | $SEC | $PERF | $REL | $MAINT | ${PASS_RATE}% |"
  else
    echo -e "${BLUE}Story ${STORY}:${NC} $TITLE"
    echo -e "  Security:       $SEC"
    echo -e "  Performance:    $PERF"
    echo -e "  Reliability:    $REL"
    echo -e "  Maintainability: $MAINT"
    echo -e "  Pass Rate:      ${PASS_RATE}%"
    echo ""
  fi
done

# Summary
if [[ "$OUTPUT_FORMAT" == "text" ]]; then
  echo -e "${BLUE}═══════════════════════════════════════${NC}"
  echo -e "${BLUE}NFR Summary Across All Stories${NC}"
  echo -e "${BLUE}═══════════════════════════════════════${NC}"
  echo ""

  if [[ $TOTAL_STORIES -gt 0 ]]; then
    SEC_PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($SEC_PASS / $TOTAL_STORIES) * 100}")
    PERF_PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PERF_PASS / $TOTAL_STORIES) * 100}")
    REL_PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($REL_PASS / $TOTAL_STORIES) * 100}")
    MAINT_PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($MAINT_PASS / $TOTAL_STORIES) * 100}")

    echo -e "Security:       ${GREEN}${SEC_PASS} PASS${NC}, ${YELLOW}${SEC_CONCERNS} CONCERNS${NC}, ${RED}${SEC_FAIL} FAIL${NC} (${SEC_PASS_RATE}% pass rate)"
    echo -e "Performance:    ${GREEN}${PERF_PASS} PASS${NC}, ${YELLOW}${PERF_CONCERNS} CONCERNS${NC}, ${RED}${PERF_FAIL} FAIL${NC} (${PERF_PASS_RATE}% pass rate)"
    echo -e "Reliability:    ${GREEN}${REL_PASS} PASS${NC}, ${YELLOW}${REL_CONCERNS} CONCERNS${NC}, ${RED}${REL_FAIL} FAIL${NC} (${REL_PASS_RATE}% pass rate)"
    echo -e "Maintainability: ${GREEN}${MAINT_PASS} PASS${NC}, ${YELLOW}${MAINT_CONCERNS} CONCERNS${NC}, ${RED}${MAINT_FAIL} FAIL${NC} (${MAINT_PASS_RATE}% pass rate)"
    echo ""

    # Overall NFR pass rate
    TOTAL_NFR_CHECKS=$((TOTAL_STORIES * 4))
    TOTAL_NFR_PASSES=$((SEC_PASS + PERF_PASS + REL_PASS + MAINT_PASS))
    OVERALL_PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($TOTAL_NFR_PASSES / $TOTAL_NFR_CHECKS) * 100}")

    echo -e "${GRAY}Overall NFR Pass Rate:${NC} ${OVERALL_PASS_RATE}% (${TOTAL_NFR_PASSES}/${TOTAL_NFR_CHECKS} checks)"
  fi
fi
