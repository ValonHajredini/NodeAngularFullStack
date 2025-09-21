#!/usr/bin/env node

/**
 * Success Metrics Collector
 *
 * Tracks developer productivity and onboarding success metrics
 * to measure the effectiveness of the boilerplate and tutorials.
 *
 * Metrics tracked:
 * - Tutorial completion rates
 * - Time to first feature implementation
 * - Developer productivity improvements
 * - Error reduction rates
 * - Onboarding success rates
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const METRICS_DIR = path.join(__dirname, '..', '.metrics');
const METRICS_FILE = path.join(METRICS_DIR, 'developer-metrics.json');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  metric: (msg) => console.log(`${colors.cyan}📊 ${msg}${colors.reset}`)
};

/**
 * Initialize metrics directory and file
 */
function initializeMetrics() {
  if (!fs.existsSync(METRICS_DIR)) {
    fs.mkdirSync(METRICS_DIR, { recursive: true });
  }

  if (!fs.existsSync(METRICS_FILE)) {
    const initialData = {
      version: '1.0.0',
      projectId: generateProjectId(),
      startDate: new Date().toISOString(),
      sessions: [],
      tutorials: {},
      features: [],
      metrics: {
        totalSessions: 0,
        tutorialCompletions: 0,
        featuresImplemented: 0,
        averageTimeToFirstFeature: 0,
        errorReductionRate: 0,
        onboardingSuccessRate: 0
      }
    };
    fs.writeFileSync(METRICS_FILE, JSON.stringify(initialData, null, 2));
    log.success('Metrics tracking initialized');
  }
}

/**
 * Generate unique project ID
 */
function generateProjectId() {
  return 'proj_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Load metrics data
 */
function loadMetrics() {
  try {
    const data = fs.readFileSync(METRICS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    log.error('Failed to load metrics data');
    return null;
  }
}

/**
 * Save metrics data
 */
function saveMetrics(data) {
  try {
    fs.writeFileSync(METRICS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    log.error('Failed to save metrics data');
    return false;
  }
}

/**
 * Start a new development session
 */
function startSession(sessionType = 'development') {
  const metrics = loadMetrics();
  if (!metrics) return;

  const sessionId = 'session_' + Date.now();
  const session = {
    id: sessionId,
    type: sessionType,
    startTime: new Date().toISOString(),
    endTime: null,
    duration: 0,
    activities: [],
    tutorials: [],
    features: [],
    errors: []
  };

  metrics.sessions.push(session);
  metrics.metrics.totalSessions++;

  saveMetrics(metrics);
  log.info(`Started ${sessionType} session: ${sessionId}`);
  return sessionId;
}

/**
 * End a development session
 */
function endSession(sessionId) {
  const metrics = loadMetrics();
  if (!metrics) return;

  const session = metrics.sessions.find(s => s.id === sessionId);
  if (!session) {
    log.error(`Session ${sessionId} not found`);
    return;
  }

  session.endTime = new Date().toISOString();
  session.duration = new Date(session.endTime) - new Date(session.startTime);

  saveMetrics(metrics);
  log.info(`Ended session: ${sessionId} (Duration: ${formatDuration(session.duration)})`);
}

/**
 * Track tutorial progress
 */
function trackTutorialProgress(tutorialName, step, completed = false) {
  const metrics = loadMetrics();
  if (!metrics) return;

  if (!metrics.tutorials[tutorialName]) {
    metrics.tutorials[tutorialName] = {
      name: tutorialName,
      startTime: new Date().toISOString(),
      completedSteps: [],
      totalTime: 0,
      completed: false,
      completionTime: null
    };
  }

  const tutorial = metrics.tutorials[tutorialName];

  if (step && !tutorial.completedSteps.includes(step)) {
    tutorial.completedSteps.push(step);
    log.metric(`Tutorial progress: ${tutorialName} - Step ${step} completed`);
  }

  if (completed && !tutorial.completed) {
    tutorial.completed = true;
    tutorial.completionTime = new Date().toISOString();
    tutorial.totalTime = new Date(tutorial.completionTime) - new Date(tutorial.startTime);
    metrics.metrics.tutorialCompletions++;

    log.success(`Tutorial completed: ${tutorialName} (Time: ${formatDuration(tutorial.totalTime)})`);
  }

  saveMetrics(metrics);
}

/**
 * Track feature implementation
 */
function trackFeatureImplementation(featureName, timeSpent = 0, linesOfCode = 0) {
  const metrics = loadMetrics();
  if (!metrics) return;

  const feature = {
    name: featureName,
    implementationTime: new Date().toISOString(),
    timeSpent: timeSpent,
    linesOfCode: linesOfCode,
    testsWritten: 0,
    bugCount: 0
  };

  metrics.features.push(feature);
  metrics.metrics.featuresImplemented++;

  // Calculate average time to first feature
  if (metrics.features.length === 1) {
    const startDate = new Date(metrics.startDate);
    const firstFeatureTime = new Date(feature.implementationTime);
    metrics.metrics.averageTimeToFirstFeature = firstFeatureTime - startDate;
  }

  saveMetrics(metrics);
  log.success(`Feature implemented: ${featureName} (Time: ${formatDuration(timeSpent)})`);
}

/**
 * Track development errors
 */
function trackError(errorType, errorMessage, resolved = false) {
  const metrics = loadMetrics();
  if (!metrics) return;

  const currentSession = getCurrentSession(metrics);
  if (currentSession) {
    currentSession.errors.push({
      type: errorType,
      message: errorMessage,
      timestamp: new Date().toISOString(),
      resolved: resolved
    });

    saveMetrics(metrics);
    log.warning(`Error tracked: ${errorType} - ${errorMessage}`);
  }
}

/**
 * Generate productivity report
 */
function generateProductivityReport() {
  const metrics = loadMetrics();
  if (!metrics) return;

  const report = {
    projectInfo: {
      projectId: metrics.projectId,
      startDate: metrics.startDate,
      totalDays: Math.ceil((Date.now() - new Date(metrics.startDate)) / (1000 * 60 * 60 * 24))
    },
    sessions: {
      total: metrics.metrics.totalSessions,
      averageDuration: calculateAverageSessionDuration(metrics.sessions),
      totalDevelopmentTime: calculateTotalDevelopmentTime(metrics.sessions)
    },
    tutorials: {
      total: Object.keys(metrics.tutorials).length,
      completed: metrics.metrics.tutorialCompletions,
      completionRate: calculateTutorialCompletionRate(metrics.tutorials),
      averageCompletionTime: calculateAverageTutorialTime(metrics.tutorials)
    },
    features: {
      total: metrics.metrics.featuresImplemented,
      averageImplementationTime: calculateAverageFeatureTime(metrics.features),
      timeToFirstFeature: metrics.metrics.averageTimeToFirstFeature
    },
    productivity: {
      dailyFeatureRate: calculateDailyFeatureRate(metrics),
      errorRate: calculateErrorRate(metrics.sessions),
      timeSavings: calculateTimeSavings(metrics)
    }
  };

  return report;
}

/**
 * Display metrics dashboard
 */
function displayDashboard() {
  const report = generateProductivityReport();
  if (!report) return;

  console.log('\n' + '='.repeat(60));
  console.log('📊 DEVELOPER PRODUCTIVITY DASHBOARD');
  console.log('='.repeat(60));

  // Project Information
  console.log('\n🏗️  PROJECT INFORMATION');
  console.log(`   Project ID: ${report.projectInfo.projectId}`);
  console.log(`   Start Date: ${new Date(report.projectInfo.startDate).toLocaleDateString()}`);
  console.log(`   Days Active: ${report.projectInfo.totalDays}`);

  // Session Metrics
  console.log('\n⏱️  SESSION METRICS');
  console.log(`   Total Sessions: ${report.sessions.total}`);
  console.log(`   Average Duration: ${formatDuration(report.sessions.averageDuration)}`);
  console.log(`   Total Dev Time: ${formatDuration(report.sessions.totalDevelopmentTime)}`);

  // Tutorial Progress
  console.log('\n📚 TUTORIAL PROGRESS');
  console.log(`   Tutorials Started: ${report.tutorials.total}`);
  console.log(`   Tutorials Completed: ${report.tutorials.completed}`);
  console.log(`   Completion Rate: ${(report.tutorials.completionRate * 100).toFixed(1)}%`);
  console.log(`   Avg Completion Time: ${formatDuration(report.tutorials.averageCompletionTime)}`);

  // Feature Development
  console.log('\n🚀 FEATURE DEVELOPMENT');
  console.log(`   Features Implemented: ${report.features.total}`);
  console.log(`   Avg Implementation Time: ${formatDuration(report.features.averageImplementationTime)}`);
  console.log(`   Time to First Feature: ${formatDuration(report.features.timeToFirstFeature)}`);

  // Productivity Insights
  console.log('\n📈 PRODUCTIVITY INSIGHTS');
  console.log(`   Daily Feature Rate: ${report.productivity.dailyFeatureRate.toFixed(2)} features/day`);
  console.log(`   Error Rate: ${(report.productivity.errorRate * 100).toFixed(1)}%`);
  console.log(`   Estimated Time Savings: ${(report.productivity.timeSavings * 100).toFixed(1)}%`);

  // Success Metrics
  console.log('\n🎯 SUCCESS METRICS');
  const timeSavingsGoal = 40; // 40% time savings goal
  const achievedGoal = report.productivity.timeSavings >= (timeSavingsGoal / 100);

  console.log(`   Time Savings Goal: ${timeSavingsGoal}%`);
  console.log(`   Current Achievement: ${(report.productivity.timeSavings * 100).toFixed(1)}%`);

  if (achievedGoal) {
    log.success(`🎉 Goal achieved! You've exceeded the ${timeSavingsGoal}% time savings target!`);
  } else {
    const remaining = timeSavingsGoal - (report.productivity.timeSavings * 100);
    log.info(`📊 ${remaining.toFixed(1)}% more time savings needed to reach the goal`);
  }

  console.log('\n' + '='.repeat(60));
}

/**
 * Helper functions for calculations
 */
function getCurrentSession(metrics) {
  return metrics.sessions.find(s => !s.endTime);
}

function calculateAverageSessionDuration(sessions) {
  const completedSessions = sessions.filter(s => s.endTime);
  if (completedSessions.length === 0) return 0;

  const totalDuration = completedSessions.reduce((sum, s) => sum + s.duration, 0);
  return totalDuration / completedSessions.length;
}

function calculateTotalDevelopmentTime(sessions) {
  return sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
}

function calculateTutorialCompletionRate(tutorials) {
  const totalTutorials = Object.keys(tutorials).length;
  if (totalTutorials === 0) return 0;

  const completedTutorials = Object.values(tutorials).filter(t => t.completed).length;
  return completedTutorials / totalTutorials;
}

function calculateAverageTutorialTime(tutorials) {
  const completedTutorials = Object.values(tutorials).filter(t => t.completed);
  if (completedTutorials.length === 0) return 0;

  const totalTime = completedTutorials.reduce((sum, t) => sum + t.totalTime, 0);
  return totalTime / completedTutorials.length;
}

function calculateAverageFeatureTime(features) {
  if (features.length === 0) return 0;

  const totalTime = features.reduce((sum, f) => sum + f.timeSpent, 0);
  return totalTime / features.length;
}

function calculateDailyFeatureRate(metrics) {
  const days = Math.ceil((Date.now() - new Date(metrics.startDate)) / (1000 * 60 * 60 * 24));
  return days > 0 ? metrics.features.length / days : 0;
}

function calculateErrorRate(sessions) {
  const totalErrors = sessions.reduce((sum, s) => sum + (s.errors?.length || 0), 0);
  const totalSessions = sessions.length;
  return totalSessions > 0 ? totalErrors / totalSessions : 0;
}

function calculateTimeSavings(metrics) {
  // Base calculation on feature implementation time vs traditional approach
  const traditionalTimePerFeature = 120 * 60 * 1000; // 120 minutes in milliseconds
  const averageFeatureTime = calculateAverageFeatureTime(metrics.features);

  if (averageFeatureTime === 0) return 0;

  return Math.max(0, (traditionalTimePerFeature - averageFeatureTime) / traditionalTimePerFeature);
}

function formatDuration(milliseconds) {
  if (milliseconds === 0) return '0 minutes';

  const minutes = Math.floor(milliseconds / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Export metrics data for analysis
 */
function exportMetrics(format = 'json') {
  const metrics = loadMetrics();
  if (!metrics) return;

  const report = generateProductivityReport();
  const exportData = {
    timestamp: new Date().toISOString(),
    projectId: metrics.projectId,
    summary: report,
    rawData: metrics
  };

  const exportFile = path.join(METRICS_DIR, `metrics-export-${Date.now()}.${format}`);

  if (format === 'json') {
    fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
  } else if (format === 'csv') {
    const csv = convertToCSV(exportData);
    fs.writeFileSync(exportFile, csv);
  }

  log.success(`Metrics exported to: ${exportFile}`);
  return exportFile;
}

function convertToCSV(data) {
  // Simple CSV conversion for basic metrics
  const lines = [
    'Metric,Value',
    `Total Sessions,${data.summary.sessions.total}`,
    `Tutorial Completion Rate,${(data.summary.tutorials.completionRate * 100).toFixed(1)}%`,
    `Features Implemented,${data.summary.features.total}`,
    `Time Savings,${(data.summary.productivity.timeSavings * 100).toFixed(1)}%`,
    `Daily Feature Rate,${data.summary.productivity.dailyFeatureRate.toFixed(2)}`
  ];
  return lines.join('\n');
}

// CLI interface
const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
  case 'init':
    initializeMetrics();
    break;

  case 'start-session':
    const sessionType = args[0] || 'development';
    startSession(sessionType);
    break;

  case 'end-session':
    const sessionId = args[0];
    if (!sessionId) {
      log.error('Session ID required');
      process.exit(1);
    }
    endSession(sessionId);
    break;

  case 'tutorial':
    const tutorialName = args[0];
    const step = args[1];
    const completed = args[2] === 'true';
    if (!tutorialName) {
      log.error('Tutorial name required');
      process.exit(1);
    }
    trackTutorialProgress(tutorialName, step, completed);
    break;

  case 'feature':
    const featureName = args[0];
    const timeSpent = parseInt(args[1]) || 0;
    const linesOfCode = parseInt(args[2]) || 0;
    if (!featureName) {
      log.error('Feature name required');
      process.exit(1);
    }
    trackFeatureImplementation(featureName, timeSpent, linesOfCode);
    break;

  case 'error':
    const errorType = args[0];
    const errorMessage = args[1];
    const resolved = args[2] === 'true';
    if (!errorType || !errorMessage) {
      log.error('Error type and message required');
      process.exit(1);
    }
    trackError(errorType, errorMessage, resolved);
    break;

  case 'dashboard':
    displayDashboard();
    break;

  case 'export':
    const format = args[0] || 'json';
    exportMetrics(format);
    break;

  case 'report':
    const report = generateProductivityReport();
    console.log(JSON.stringify(report, null, 2));
    break;

  default:
    console.log(`
📊 Success Metrics Collector

Usage: node metrics-collector.js <command> [args]

Commands:
  init                           Initialize metrics tracking
  start-session [type]           Start a development session
  end-session <sessionId>        End a development session
  tutorial <name> [step] [done]  Track tutorial progress
  feature <name> [time] [loc]    Track feature implementation
  error <type> <message> [done]  Track development error
  dashboard                      Show productivity dashboard
  export [format]                Export metrics (json|csv)
  report                         Generate JSON report

Examples:
  node metrics-collector.js init
  node metrics-collector.js start-session onboarding
  node metrics-collector.js tutorial "first-feature" "step-1"
  node metrics-collector.js feature "user-auth" 2700000 150
  node metrics-collector.js dashboard
    `);
    break;
}

// Export functions for programmatic use
export {
  initializeMetrics,
  startSession,
  endSession,
  trackTutorialProgress,
  trackFeatureImplementation,
  trackError,
  generateProductivityReport,
  displayDashboard,
  exportMetrics
};