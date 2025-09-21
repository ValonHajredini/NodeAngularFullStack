#!/usr/bin/env node

/**
 * Developer Feedback Collection System
 *
 * Collects feedback from developers about their experience with the boilerplate,
 * tutorials, and development workflow to continuously improve the system.
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const FEEDBACK_DIR = path.join(__dirname, '..', '.feedback');
const FEEDBACK_FILE = path.join(FEEDBACK_DIR, 'developer-feedback.json');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  question: (msg) => console.log(`${colors.cyan}❓ ${msg}${colors.reset}`),
  highlight: (msg) => console.log(`${colors.magenta}✨ ${msg}${colors.reset}`)
};

/**
 * Initialize feedback system
 */
function initializeFeedback() {
  if (!fs.existsSync(FEEDBACK_DIR)) {
    fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
  }

  if (!fs.existsSync(FEEDBACK_FILE)) {
    const initialData = {
      version: '1.0.0',
      feedbackSessions: [],
      aggregatedRatings: {
        overallSatisfaction: [],
        tutorialQuality: [],
        documentationClarity: [],
        setupExperience: [],
        developmentExperience: [],
        timeSavings: []
      },
      suggestions: [],
      issues: [],
      successStories: []
    };
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(initialData, null, 2));
    log.success('Feedback system initialized');
  }
}

/**
 * Load feedback data
 */
function loadFeedback() {
  try {
    const data = fs.readFileSync(FEEDBACK_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    log.error('Failed to load feedback data');
    return null;
  }
}

/**
 * Save feedback data
 */
function saveFeedback(data) {
  try {
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    log.error('Failed to save feedback data');
    return false;
  }
}

/**
 * Create readline interface for interactive input
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Ask a question and get user input
 */
function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Collect comprehensive feedback from developer
 */
async function collectFeedback() {
  const rl = createInterface();

  console.log('\n' + '='.repeat(60));
  console.log('💬 DEVELOPER FEEDBACK COLLECTION');
  console.log('='.repeat(60));
  console.log('\nHelp us improve NodeAngularFullStack by sharing your experience!');
  console.log('Your feedback is anonymous and helps make the boilerplate better for everyone.\n');

  try {
    const feedback = {
      id: 'feedback_' + Date.now(),
      timestamp: new Date().toISOString(),
      type: 'comprehensive'
    };

    // Basic Information
    log.info('📊 Basic Information');
    feedback.experienceLevel = await askQuestion(rl,
      'What is your experience level with this tech stack? (beginner/intermediate/advanced): ');

    feedback.projectType = await askQuestion(rl,
      'What type of project are you building? (learning/personal/commercial/enterprise): ');

    feedback.timeSpent = await askQuestion(rl,
      'How much time have you spent with this boilerplate? (hours/days/weeks): ');

    // Ratings (1-5 scale)
    console.log('\n');
    log.info('⭐ Ratings (1-5 scale, 5 being excellent)');

    feedback.ratings = {};
    feedback.ratings.overallSatisfaction = parseInt(await askQuestion(rl,
      'Overall satisfaction with the boilerplate (1-5): ')) || 0;

    feedback.ratings.tutorialQuality = parseInt(await askQuestion(rl,
      'Quality of tutorials and examples (1-5): ')) || 0;

    feedback.ratings.documentationClarity = parseInt(await askQuestion(rl,
      'Clarity of documentation (1-5): ')) || 0;

    feedback.ratings.setupExperience = parseInt(await askQuestion(rl,
      'Initial setup experience (1-5): ')) || 0;

    feedback.ratings.developmentExperience = parseInt(await askQuestion(rl,
      'Development experience (1-5): ')) || 0;

    // Time Savings
    console.log('\n');
    log.info('⏱️  Productivity Impact');
    feedback.timeSavingsEstimate = parseInt(await askQuestion(rl,
      'Estimated time savings compared to starting from scratch (0-100%): ')) || 0;

    feedback.productivityImprovement = await askQuestion(rl,
      'How has this boilerplate improved your productivity? ');

    // Specific Feedback
    console.log('\n');
    log.info('📝 Detailed Feedback');

    feedback.mostHelpful = await askQuestion(rl,
      'What was the most helpful feature or aspect? ');

    feedback.mostDifficult = await askQuestion(rl,
      'What was the most difficult or confusing part? ');

    feedback.missing = await askQuestion(rl,
      'What features or documentation are missing? ');

    feedback.suggestions = await askQuestion(rl,
      'What suggestions do you have for improvement? ');

    // Tutorial Specific
    console.log('\n');
    log.info('📚 Tutorial Feedback');

    feedback.tutorialsCompleted = await askQuestion(rl,
      'Which tutorials have you completed? ');

    feedback.tutorialDifficulty = await askQuestion(rl,
      'Were the tutorials too easy, just right, or too difficult? ');

    feedback.tutorialSuggestions = await askQuestion(rl,
      'What additional tutorials would be helpful? ');

    // Success Stories
    console.log('\n');
    log.info('🎉 Success Stories');

    feedback.achievements = await askQuestion(rl,
      'What have you successfully built or accomplished? ');

    feedback.wouldRecommend = await askQuestion(rl,
      'Would you recommend this boilerplate to others? (yes/no/maybe): ');

    feedback.recommendationReason = await askQuestion(rl,
      'Why would/wouldn\'t you recommend it? ');

    // Contact (Optional)
    console.log('\n');
    log.info('📧 Follow-up (Optional)');

    feedback.allowFollowup = await askQuestion(rl,
      'Can we contact you for follow-up questions? (yes/no): ');

    if (feedback.allowFollowup.toLowerCase() === 'yes') {
      feedback.contact = await askQuestion(rl,
        'Email or GitHub username (optional): ');
    }

    // Save feedback
    const feedbackData = loadFeedback();
    if (feedbackData) {
      feedbackData.feedbackSessions.push(feedback);

      // Update aggregated ratings
      Object.keys(feedback.ratings).forEach(key => {
        if (feedbackData.aggregatedRatings[key]) {
          feedbackData.aggregatedRatings[key].push(feedback.ratings[key]);
        }
      });

      if (feedback.suggestions) {
        feedbackData.suggestions.push({
          timestamp: feedback.timestamp,
          suggestion: feedback.suggestions,
          context: {
            experienceLevel: feedback.experienceLevel,
            projectType: feedback.projectType
          }
        });
      }

      if (feedback.achievements) {
        feedbackData.successStories.push({
          timestamp: feedback.timestamp,
          story: feedback.achievements,
          timeSavings: feedback.timeSavingsEstimate,
          recommendation: feedback.wouldRecommend
        });
      }

      saveFeedback(feedbackData);

      console.log('\n');
      log.success('Thank you for your feedback! 🙏');
      log.info('Your input helps us improve the boilerplate for everyone.');

      if (feedback.ratings.overallSatisfaction >= 4) {
        log.highlight('We\'re thrilled you\'re having a great experience! 🎉');
      } else if (feedback.ratings.overallSatisfaction <= 2) {
        log.warning('We\'re sorry you\'re having difficulties. We\'ll work on improvements!');
      }
    }

  } catch (error) {
    log.error('Error collecting feedback: ' + error.message);
  } finally {
    rl.close();
  }
}

/**
 * Collect quick feedback (rating only)
 */
async function collectQuickFeedback() {
  const rl = createInterface();

  console.log('\n⚡ Quick Feedback');
  console.log('This will only take 30 seconds!\n');

  try {
    const feedback = {
      id: 'quick_' + Date.now(),
      timestamp: new Date().toISOString(),
      type: 'quick'
    };

    feedback.overallRating = parseInt(await askQuestion(rl,
      'Rate your overall experience (1-5): ')) || 0;

    feedback.wouldRecommend = await askQuestion(rl,
      'Would you recommend this to a colleague? (yes/no): ');

    feedback.quickComment = await askQuestion(rl,
      'One thing we could improve (optional): ');

    // Save quick feedback
    const feedbackData = loadFeedback();
    if (feedbackData) {
      feedbackData.feedbackSessions.push(feedback);
      feedbackData.aggregatedRatings.overallSatisfaction.push(feedback.overallRating);

      if (feedback.quickComment) {
        feedbackData.suggestions.push({
          timestamp: feedback.timestamp,
          suggestion: feedback.quickComment,
          context: { type: 'quick' }
        });
      }

      saveFeedback(feedbackData);
      log.success('Thanks for the quick feedback! 👍');
    }

  } catch (error) {
    log.error('Error collecting quick feedback: ' + error.message);
  } finally {
    rl.close();
  }
}

/**
 * Generate feedback analytics report
 */
function generateFeedbackReport() {
  const feedback = loadFeedback();
  if (!feedback) return null;

  const report = {
    summary: {
      totalFeedbackSessions: feedback.feedbackSessions.length,
      averageRatings: {},
      recommendationRate: 0,
      responseRate: 0
    },
    insights: {
      topSuggestions: [],
      commonIssues: [],
      successPatterns: [],
      improvementAreas: []
    },
    trends: {
      ratingTrends: {},
      satisfactionTrend: 'stable'
    }
  };

  // Calculate average ratings
  Object.keys(feedback.aggregatedRatings).forEach(key => {
    const ratings = feedback.aggregatedRatings[key];
    if (ratings.length > 0) {
      const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      report.summary.averageRatings[key] = Math.round(average * 10) / 10;
    }
  });

  // Calculate recommendation rate
  const recommendationResponses = feedback.feedbackSessions
    .filter(f => f.wouldRecommend)
    .map(f => f.wouldRecommend.toLowerCase());

  const positiveRecommendations = recommendationResponses.filter(r => r === 'yes').length;
  report.summary.recommendationRate = recommendationResponses.length > 0
    ? (positiveRecommendations / recommendationResponses.length) * 100
    : 0;

  // Analyze suggestions for patterns
  const suggestions = feedback.suggestions.map(s => s.suggestion.toLowerCase());
  const suggestionCounts = {};

  suggestions.forEach(suggestion => {
    // Simple keyword analysis
    const keywords = ['documentation', 'tutorial', 'example', 'performance', 'setup', 'testing'];
    keywords.forEach(keyword => {
      if (suggestion.includes(keyword)) {
        suggestionCounts[keyword] = (suggestionCounts[keyword] || 0) + 1;
      }
    });
  });

  report.insights.topSuggestions = Object.entries(suggestionCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([keyword, count]) => ({ area: keyword, mentions: count }));

  // Success stories analysis
  report.insights.successPatterns = feedback.successStories
    .filter(story => story.timeSavings > 30)
    .map(story => ({
      timeSavings: story.timeSavings,
      recommendation: story.recommendation
    }));

  return report;
}

/**
 * Display feedback analytics dashboard
 */
function displayFeedbackDashboard() {
  const report = generateFeedbackReport();
  if (!report) {
    log.error('No feedback data available');
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log('📈 FEEDBACK ANALYTICS DASHBOARD');
  console.log('='.repeat(60));

  // Summary Statistics
  console.log('\n📊 SUMMARY STATISTICS');
  console.log(`   Total Feedback Sessions: ${report.summary.totalFeedbackSessions}`);
  console.log(`   Recommendation Rate: ${report.summary.recommendationRate.toFixed(1)}%`);

  // Average Ratings
  console.log('\n⭐ AVERAGE RATINGS');
  Object.entries(report.summary.averageRatings).forEach(([key, rating]) => {
    const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
    console.log(`   ${formatCamelCase(key)}: ${rating}/5 ${stars}`);
  });

  // Top Improvement Areas
  console.log('\n🔧 TOP IMPROVEMENT AREAS');
  if (report.insights.topSuggestions.length > 0) {
    report.insights.topSuggestions.forEach((item, index) => {
      console.log(`   ${index + 1}. ${formatCamelCase(item.area)} (${item.mentions} mentions)`);
    });
  } else {
    console.log('   No specific patterns identified yet');
  }

  // Success Metrics
  console.log('\n🎯 SUCCESS METRICS');
  const avgOverallRating = report.summary.averageRatings.overallSatisfaction || 0;
  const timeSavingsGoal = 40;

  const successfulProjects = report.insights.successPatterns.length;
  const avgTimeSavings = successfulProjects > 0
    ? report.insights.successPatterns.reduce((sum, p) => sum + p.timeSavings, 0) / successfulProjects
    : 0;

  console.log(`   Average Satisfaction: ${avgOverallRating}/5`);
  console.log(`   Average Time Savings: ${avgTimeSavings.toFixed(1)}%`);
  console.log(`   Time Savings Goal: ${timeSavingsGoal}%`);

  if (avgTimeSavings >= timeSavingsGoal) {
    log.success('🎉 Time savings goal achieved!');
  } else {
    log.info(`📈 ${(timeSavingsGoal - avgTimeSavings).toFixed(1)}% more needed to reach goal`);
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS');
  if (avgOverallRating < 3.5) {
    log.warning('Focus on addressing core satisfaction issues');
  }
  if (report.summary.recommendationRate < 70) {
    log.warning('Work on improving recommendation rate');
  }
  if (report.insights.topSuggestions.length > 0) {
    log.info(`Priority: Improve ${report.insights.topSuggestions[0].area}`);
  }

  console.log('\n' + '='.repeat(60));
}

/**
 * Helper function to format camelCase to readable text
 */
function formatCamelCase(str) {
  return str.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

/**
 * Export feedback data
 */
function exportFeedbackData(format = 'json') {
  const feedback = loadFeedback();
  if (!feedback) return;

  const report = generateFeedbackReport();
  const exportData = {
    timestamp: new Date().toISOString(),
    summary: report,
    rawFeedback: feedback
  };

  const exportFile = path.join(FEEDBACK_DIR, `feedback-export-${Date.now()}.${format}`);

  if (format === 'json') {
    fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
  } else if (format === 'csv') {
    const csv = convertFeedbackToCSV(exportData);
    fs.writeFileSync(exportFile, csv);
  }

  log.success(`Feedback data exported to: ${exportFile}`);
  return exportFile;
}

function convertFeedbackToCSV(data) {
  const lines = ['Metric,Value'];

  // Add summary metrics
  lines.push(`Total Sessions,${data.summary.totalFeedbackSessions}`);
  lines.push(`Recommendation Rate,${data.summary.recommendationRate.toFixed(1)}%`);

  // Add average ratings
  Object.entries(data.summary.averageRatings).forEach(([key, value]) => {
    lines.push(`${formatCamelCase(key)},${value}`);
  });

  return lines.join('\n');
}

// CLI interface
const command = process.argv[2];

switch (command) {
  case 'init':
    initializeFeedback();
    break;

  case 'collect':
    await collectFeedback();
    break;

  case 'quick':
    await collectQuickFeedback();
    break;

  case 'dashboard':
    displayFeedbackDashboard();
    break;

  case 'report':
    const report = generateFeedbackReport();
    if (report) {
      console.log(JSON.stringify(report, null, 2));
    }
    break;

  case 'export':
    const format = process.argv[3] || 'json';
    exportFeedbackData(format);
    break;

  default:
    console.log(`
💬 Developer Feedback Collection System

Usage: node feedback-collector.js <command>

Commands:
  init        Initialize feedback system
  collect     Collect comprehensive feedback (5-10 minutes)
  quick       Collect quick feedback (30 seconds)
  dashboard   Display feedback analytics dashboard
  report      Generate JSON analytics report
  export      Export feedback data (json|csv)

Examples:
  node feedback-collector.js init
  node feedback-collector.js collect
  node feedback-collector.js quick
  node feedback-collector.js dashboard
    `);
    break;
}

// Export functions for programmatic use
export {
  initializeFeedback,
  collectFeedback,
  collectQuickFeedback,
  generateFeedbackReport,
  displayFeedbackDashboard,
  exportFeedbackData
};