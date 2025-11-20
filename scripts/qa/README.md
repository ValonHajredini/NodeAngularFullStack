# QA Automation Scripts

Automated tools for quality gate checking and reporting.

## 📋 Available Scripts

### 1. `check-gates.sh` - Quality Gate Status Checker

Scans all gate files and reports on quality metrics.

**Basic Usage:**

```bash
# Check all gates
./scripts/qa/check-gates.sh

# Check specific story
./scripts/qa/check-gates.sh --story 31.2.4

# Summary only (no details)
./scripts/qa/check-gates.sh --summary

# Fail on FAIL gates (for CI/CD)
./scripts/qa/check-gates.sh --fail-on-fail
```

**Output Example:**

```
╔════════════════════════════════════════════════════════════════╗
║                  Quality Gate Status Report                   ║
╚════════════════════════════════════════════════════════════════╝

✗ Story 31.2.4: Tool Registration API Integration
  Gate: FAIL | Score: 60/100
  Issues: 3 high, 2 medium, 0 low
  NFR: Security=CONCERNS Performance=PASS Reliability=CONCERNS Maintainability=PASS
  Reviewed: 2025-10-25T00:00:00Z by Quinn (Test Architect)
  File: docs/qa/gates/31.2.4-tool-registration-api-integration.yml

╔════════════════════════════════════════════════════════════════╗
║                         Summary                                ║
╚════════════════════════════════════════════════════════════════╝

  Total Gates: 2
  ✓ PASS:      1
  ⚠ CONCERNS:  0
  ✗ FAIL:      1
  ⊘ WAIVED:    0

  Pass Rate: 50.0% (excluding WAIVED)

⚠ Warning: 1 gate(s) have FAIL status
  (Use --fail-on-fail to block CI/CD on failures)
```

**CI/CD Integration:**

```yaml
# .github/workflows/quality-check.yml
- name: Check Quality Gates
  run: ./scripts/qa/check-gates.sh --fail-on-fail
```

**Exit Codes:**

- `0` - All gates PASS (or no --fail-on-fail flag)
- `1` - One or more gates FAIL (when --fail-on-fail used)
- `2` - No gate files found

---

### 2. `gate-nfr-report.sh` - NFR Pass Rate Report

Generates detailed NFR (Non-Functional Requirements) pass rate analysis.

**Usage:**

```bash
# Text format (default)
./scripts/qa/gate-nfr-report.sh

# CSV output for spreadsheet
./scripts/qa/gate-nfr-report.sh --csv > nfr-report.csv

# Markdown table for docs
./scripts/qa/gate-nfr-report.sh --markdown >> docs/qa-metrics.md
```

**Output Example (Text):**

```
Story 31.2.4: Tool Registration API Integration
  Security:        CONCERNS
  Performance:     PASS
  Reliability:     CONCERNS
  Maintainability: PASS
  Pass Rate:       50%

═══════════════════════════════════════
NFR Summary Across All Stories
═══════════════════════════════════════

Security:       1 PASS, 1 CONCERNS, 0 FAIL (50.0% pass rate)
Performance:    2 PASS, 0 CONCERNS, 0 FAIL (100.0% pass rate)
Reliability:    1 PASS, 1 CONCERNS, 0 FAIL (50.0% pass rate)
Maintainability: 2 PASS, 0 CONCERNS, 0 FAIL (100.0% pass rate)

Overall NFR Pass Rate: 75.0% (6/8 checks)
```

**CSV Output:**

```csv
Story,Title,Security,Performance,Reliability,Maintainability,Overall_Pass_Rate
31.2.4,"Tool Registration API Integration",CONCERNS,PASS,CONCERNS,PASS,50%
26.5,"Enhanced Forms List with QR Code Display",PASS,PASS,PASS,PASS,100%
```

---

## 🔧 Quick Reference

### Check Your Latest Story

```bash
# Find your story number
ls docs/qa/gates/ | tail -1

# Check it
./scripts/qa/check-gates.sh --story 31.2.4
```

### Generate Weekly NFR Report

```bash
# Export to CSV for team review
./scripts/qa/gate-nfr-report.sh --csv > reports/nfr-weekly-$(date +%Y-%m-%d).csv

# View in terminal
./scripts/qa/gate-nfr-report.sh | less
```

### Pre-Deployment Check

```bash
# Verify all gates pass before deployment
./scripts/qa/check-gates.sh --fail-on-fail && echo "✓ Ready to deploy"
```

### Find All FAIL Gates

```bash
# List stories with FAIL status
grep -l "^gate: FAIL" docs/qa/gates/*.yml | xargs basename -s .yml
```

---

## 📊 Gate File Format

Gate files are stored in `docs/qa/gates/` with the format:

- **Filename:** `{epic}.{story}-{slug}.yml`
- **Example:** `31.2.4-tool-registration-api-integration.yml`

**Key Fields:**

```yaml
schema: 1
story: '31.2.4'
story_title: 'Tool Registration API Integration'
gate: FAIL # PASS | CONCERNS | FAIL | WAIVED
status_reason: 'Brief explanation'
quality_score: 60 # 0-100
updated: '2025-10-25T00:00:00Z'

top_issues:
  - id: 'TEST-001'
    severity: high # low | medium | high
    finding: 'Description of issue'
    suggested_action: 'How to fix'

nfr_validation:
  security: { status: CONCERNS, notes: '...' }
  performance: { status: PASS, notes: '...' }
  reliability: { status: CONCERNS, notes: '...' }
  maintainability: { status: PASS, notes: '...' }
```

---

## 🎯 Common Workflows

### Developer Workflow

1. Complete story implementation
2. Request QA review: `*review 31.2.4`
3. Check gate status: `./scripts/qa/check-gates.sh --story 31.2.4`
4. Address issues listed in gate file
5. Re-request review
6. Verify PASS: `./scripts/qa/check-gates.sh --story 31.2.4`

### QA Workflow

1. Review story code
2. Create gate file: `docs/qa/gates/{story}-{slug}.yml`
3. Run checker: `./scripts/qa/check-gates.sh --story {story}`
4. Verify gate file parsed correctly
5. Update story with QA Results section

### Release Manager Workflow

1. Generate NFR report: `./scripts/qa/gate-nfr-report.sh --csv > release-nfr.csv`
2. Check all gates: `./scripts/qa/check-gates.sh --summary`
3. Verify 100% pass rate: `./scripts/qa/check-gates.sh --fail-on-fail`
4. Approve release if all gates PASS

---

## 🚀 Future Enhancements

**Planned Features:**

- [ ] Trend analysis (compare gate scores over time)
- [ ] Slack/Discord notifications for FAIL gates
- [ ] Automatic issue creation for FAIL gates
- [ ] Quality score dashboard (HTML report)
- [ ] Gate file validator (check YAML schema)
- [ ] Batch re-review trigger for stale gates

**Integration Ideas:**

- GitHub Actions workflow to block PRs with FAIL gates
- Pre-commit hook to validate gate file format
- Daily/weekly NFR report emails
- Grafana dashboard for quality metrics

---

## 📚 Additional Resources

- **Gate Template:** `.bmad-core/templates/qa-gate-tmpl.yaml`
- **Review Task:** `.bmad-core/tasks/review-story.md`
- **QA Agent:** `.bmad-core/agents/qa.md`
- **Story Files:** `docs/stories/{epic}/{epic}.{story}.*.md`

---

**Questions?** Ask Quinn the QA agent: `*help`
