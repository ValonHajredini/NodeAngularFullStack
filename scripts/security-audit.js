#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Security audit script for monitoring dependency vulnerabilities
 * Runs npm audit on both API and Web projects and generates reports
 */

const AUDIT_LEVELS = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4
};

const DEFAULT_THRESHOLD = 'moderate';
const REPORT_DIR = path.join(__dirname, '..', 'reports', 'security');

async function runAudit(projectPath, projectName) {
  console.log(`🔍 Running security audit for ${projectName}...`);

  try {
    // Ensure reports directory exists
    fs.mkdirSync(REPORT_DIR, { recursive: true });

    const auditCommand = `npm audit --audit-level=${DEFAULT_THRESHOLD} --json`;
    const result = execSync(auditCommand, {
      cwd: projectPath,
      encoding: 'utf8',
      stdio: 'pipe'
    });

    const auditData = JSON.parse(result);
    const reportPath = path.join(REPORT_DIR, `${projectName}-audit.json`);

    // Save detailed audit report
    fs.writeFileSync(reportPath, JSON.stringify(auditData, null, 2));

    // Generate summary
    const summary = generateSummary(auditData, projectName);
    console.log(summary);

    return {
      success: true,
      vulnerabilities: auditData.metadata?.vulnerabilities || {},
      reportPath
    };

  } catch (error) {
    if (error.status !== 0) {
      // npm audit returns non-zero exit code when vulnerabilities are found
      try {
        const auditData = JSON.parse(error.stdout);
        const reportPath = path.join(REPORT_DIR, `${projectName}-audit.json`);

        fs.writeFileSync(reportPath, JSON.stringify(auditData, null, 2));

        const summary = generateSummary(auditData, projectName);
        console.log(summary);

        return {
          success: false,
          vulnerabilities: auditData.metadata?.vulnerabilities || {},
          reportPath,
          error: 'Vulnerabilities found'
        };
      } catch (parseError) {
        console.error(`❌ Failed to parse audit results for ${projectName}:`, parseError.message);
        return {
          success: false,
          error: parseError.message
        };
      }
    } else {
      console.error(`❌ Failed to run audit for ${projectName}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

function generateSummary(auditData, projectName) {
  const vulnerabilities = auditData.metadata?.vulnerabilities || {};
  const totalVulns = Object.values(vulnerabilities).reduce((sum, count) => sum + count, 0);

  let summary = `\n📊 Security Audit Summary for ${projectName}\n`;
  summary += `${'='.repeat(50)}\n`;

  if (totalVulns === 0) {
    summary += `✅ No vulnerabilities found!\n`;
  } else {
    summary += `⚠️  Total vulnerabilities: ${totalVulns}\n`;
    summary += `   • Info: ${vulnerabilities.info || 0}\n`;
    summary += `   • Low: ${vulnerabilities.low || 0}\n`;
    summary += `   • Moderate: ${vulnerabilities.moderate || 0}\n`;
    summary += `   • High: ${vulnerabilities.high || 0}\n`;
    summary += `   • Critical: ${vulnerabilities.critical || 0}\n`;

    // Check if any high or critical vulnerabilities exist
    if (vulnerabilities.high > 0 || vulnerabilities.critical > 0) {
      summary += `\n🚨 HIGH PRIORITY: Found ${vulnerabilities.high + vulnerabilities.critical} high/critical vulnerabilities!\n`;
    }
  }

  summary += `\nAuditable packages: ${auditData.metadata?.dependencies || 0}\n`;
  summary += `Report saved to: reports/security/${projectName}-audit.json\n`;

  return summary;
}

function generateConsolidatedReport(apiResult, webResult) {
  const timestamp = new Date().toISOString();
  const consolidatedReport = {
    timestamp,
    projects: {
      api: {
        vulnerabilities: apiResult.vulnerabilities,
        success: apiResult.success,
        reportPath: apiResult.reportPath,
        error: apiResult.error
      },
      web: {
        vulnerabilities: webResult.vulnerabilities,
        success: webResult.success,
        reportPath: webResult.reportPath,
        error: webResult.error
      }
    },
    summary: {
      totalProjects: 2,
      projectsWithVulnerabilities: [apiResult, webResult].filter(r => !r.success).length,
      totalVulnerabilities: Object.values(apiResult.vulnerabilities || {}).reduce((sum, count) => sum + count, 0) +
                           Object.values(webResult.vulnerabilities || {}).reduce((sum, count) => sum + count, 0)
    }
  };

  const reportPath = path.join(REPORT_DIR, 'consolidated-audit.json');
  fs.writeFileSync(reportPath, JSON.stringify(consolidatedReport, null, 2));

  console.log(`\n📋 Consolidated report saved to: ${reportPath}`);
  return consolidatedReport;
}

async function main() {
  console.log('🔐 Starting security audit for all projects...\n');

  const apiPath = path.join(__dirname, '..', 'apps', 'api');
  const webPath = path.join(__dirname, '..', 'apps', 'web');

  // Check if project directories exist
  if (!fs.existsSync(apiPath)) {
    console.error('❌ API project directory not found');
    process.exit(1);
  }

  if (!fs.existsSync(webPath)) {
    console.error('❌ Web project directory not found');
    process.exit(1);
  }

  // Run audits
  const apiResult = await runAudit(apiPath, 'api');
  const webResult = await runAudit(webPath, 'web');

  // Generate consolidated report
  const consolidatedReport = generateConsolidatedReport(apiResult, webResult);

  // Final summary
  console.log('\n🎯 Final Security Audit Results');
  console.log('================================');
  console.log(`Total projects audited: ${consolidatedReport.summary.totalProjects}`);
  console.log(`Projects with vulnerabilities: ${consolidatedReport.summary.projectsWithVulnerabilities}`);
  console.log(`Total vulnerabilities: ${consolidatedReport.summary.totalVulnerabilities}`);

  // Exit with appropriate code
  const hasHighRiskVulns = [apiResult, webResult].some(result => {
    const vulns = result.vulnerabilities || {};
    return (vulns.high || 0) > 0 || (vulns.critical || 0) > 0;
  });

  if (hasHighRiskVulns) {
    console.log('\n🚨 FAILED: High or critical vulnerabilities found!');
    process.exit(1);
  } else if (!apiResult.success || !webResult.success) {
    console.log('\n⚠️  PASSED WITH WARNINGS: Some vulnerabilities found (below threshold)');
    process.exit(0);
  } else {
    console.log('\n✅ PASSED: No vulnerabilities found!');
    process.exit(0);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Security audit failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runAudit,
  generateSummary,
  generateConsolidatedReport
};