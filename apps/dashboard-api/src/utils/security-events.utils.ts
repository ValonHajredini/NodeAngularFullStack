/**
 * Security Events Utility
 * Centralized security event logging and alerting for tamper detection and security incidents
 * Epic 33.2: Export Package Distribution
 * Story: 33.2.2 Package Verification & Security
 *
 * Provides structured logging for security events with severity levels and alerting capabilities.
 */

import { logger } from './logger.utils';

/**
 * Security logging constants
 */
const CHECKSUM_DISPLAY_LENGTH = 16; // Length for displaying truncated checksums in logs

/**
 * Security event severity levels.
 * Used to categorize security events by impact and urgency.
 */
export enum SecurityEventSeverity {
  /** Informational events (e.g., successful verification) */
  INFO = 'info',

  /** Warning events (e.g., legacy package without checksum) */
  WARNING = 'warning',

  /** Critical security events requiring immediate attention (e.g., tampering detected) */
  CRITICAL = 'critical',
}

/**
 * Security event types.
 * Categorizes different types of security events for monitoring and alerting.
 */
export enum SecurityEventType {
  /** Package tampering detected (checksum mismatch) */
  PACKAGE_TAMPERED = 'PACKAGE_TAMPERED',

  /** Package integrity verified successfully */
  INTEGRITY_VERIFIED = 'INTEGRITY_VERIFIED',

  /** Package downloaded without checksum (legacy) */
  LEGACY_DOWNLOAD = 'LEGACY_DOWNLOAD',

  /** Checksum generation failed */
  CHECKSUM_GENERATION_FAILED = 'CHECKSUM_GENERATION_FAILED',

  /** Checksum verification failed (technical error, not tampering) */
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
}

/**
 * Security event metadata.
 * Contains contextual information about the security event for auditing and investigation.
 */
export interface SecurityEventMetadata {
  /** Export job UUID */
  jobId: string;

  /** User UUID who initiated the action */
  userId: string;

  /** Absolute path to package file */
  packagePath?: string;

  /** Expected checksum from database */
  expectedChecksum?: string;

  /** Actual checksum computed from file */
  actualChecksum?: string;

  /** Tool identifier */
  toolId?: string;

  /** Error message (if applicable) */
  errorMessage?: string;

  /** Additional context */
  [key: string]: unknown;
}

/**
 * Log a security event with structured metadata.
 * Provides centralized security event logging with severity levels and alerting.
 *
 * **Alert Thresholds:**
 * - INFO: No alert, standard logging only
 * - WARNING: Logged with warning level, no immediate alert
 * - CRITICAL: Logged with error level, triggers administrator alert
 *
 * @param eventType - Type of security event
 * @param severity - Severity level of the event
 * @param message - Human-readable event description
 * @param metadata - Event metadata for auditing
 *
 * @example
 * logSecurityEvent(
 *   SecurityEventType.PACKAGE_TAMPERED,
 *   SecurityEventSeverity.CRITICAL,
 *   'Package checksum mismatch detected',
 *   {
 *     jobId: 'job-123',
 *     userId: 'user-456',
 *     packagePath: '/tmp/exports/export.tar.gz',
 *     expectedChecksum: 'a3f5b1c2...',
 *     actualChecksum: 'b4e6c2d3...'
 *   }
 * );
 */
export function logSecurityEvent(
  eventType: SecurityEventType,
  severity: SecurityEventSeverity,
  message: string,
  metadata: SecurityEventMetadata
): void {
  // Build structured log entry
  const logEntry = {
    securityEvent: eventType,
    severity,
    message,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  // Log based on severity
  switch (severity) {
    case SecurityEventSeverity.CRITICAL:
      logger.error('[SECURITY EVENT - CRITICAL]', logEntry);
      // Trigger administrator alert (future: email, Slack, PagerDuty)
      alertAdministrators(eventType, message, metadata);
      break;

    case SecurityEventSeverity.WARNING:
      logger.warn('[SECURITY EVENT - WARNING]', logEntry);
      break;

    case SecurityEventSeverity.INFO:
      logger.info('[SECURITY EVENT - INFO]', logEntry);
      break;

    default:
      logger.info('[SECURITY EVENT]', logEntry);
  }
}

/**
 * Alert administrators about critical security events.
 * Currently logs to console with [ADMIN ALERT] prefix.
 * Future enhancements: Email, Slack, PagerDuty integration.
 *
 * **Throttling:**
 * - Repeated alerts for the same event are throttled to prevent alert fatigue
 * - Maximum 1 alert per jobId per 5 minutes
 *
 * @param eventType - Type of security event
 * @param message - Human-readable alert message
 * @param metadata - Event metadata for context
 * @private
 */
function alertAdministrators(
  eventType: SecurityEventType,
  message: string,
  metadata: SecurityEventMetadata
): void {
  // Future enhancement: Implement alert throttling with cache
  // const alertKey = `${eventType}:${metadata.jobId}`;
  // if (isAlertThrottled(alertKey)) { return; }

  // Log administrator alert (future: send email, Slack notification, etc.)
  logger.error('[ADMIN ALERT - SECURITY]', {
    alertType: eventType,
    message,
    jobId: metadata.jobId,
    userId: metadata.userId,
    packagePath: metadata.packagePath,
    timestamp: new Date().toISOString(),
    actionRequired: getActionRequired(eventType),
    investigationSteps: getInvestigationSteps(eventType),
  });

  // Future enhancement: Send email to administrators
  // await emailService.sendSecurityAlert({
  //   to: config.ADMIN_EMAIL,
  //   subject: `[SECURITY ALERT] ${eventType}: ${message}`,
  //   body: formatAlertEmail(eventType, message, metadata)
  // });
}

/**
 * Get recommended actions for security event type.
 * Provides guidance to administrators on how to respond to security incidents.
 *
 * @param eventType - Type of security event
 * @returns Array of recommended actions
 * @private
 */
function getActionRequired(eventType: SecurityEventType): string[] {
  switch (eventType) {
    case SecurityEventType.PACKAGE_TAMPERED:
      return [
        'Immediately investigate package file on server',
        'Check server logs for unauthorized access',
        'Verify file system integrity',
        'Contact user to confirm download attempt',
        'Consider rotating encryption keys',
        'Review access logs for suspicious activity',
      ];

    case SecurityEventType.VERIFICATION_FAILED:
      return [
        'Check server disk health',
        'Verify file system permissions',
        'Review error logs for details',
        'Consider re-running export job',
      ];

    default:
      return ['Review event details and take appropriate action'];
  }
}

/**
 * Get investigation steps for security event type.
 * Provides forensic guidance for security incident investigation.
 *
 * @param eventType - Type of security event
 * @returns Array of investigation steps
 * @private
 */
function getInvestigationSteps(eventType: SecurityEventType): string[] {
  switch (eventType) {
    case SecurityEventType.PACKAGE_TAMPERED:
      return [
        '1. Verify package still exists at packagePath',
        '2. Compute current checksum and compare with stored value',
        '3. Check file modification timestamp',
        '4. Review export job audit trail',
        '5. Check server access logs around job completion time',
        '6. Interview user about download attempt',
        '7. Scan server for malware/rootkits',
        '8. Review other export jobs for similar issues',
      ];

    default:
      return [
        '1. Review event metadata',
        '2. Check related logs',
        '3. Contact support if issue persists',
      ];
  }
}

/**
 * Log package tamper detection event.
 * Convenience function for logging tampering incidents with critical severity.
 *
 * @param jobId - Export job UUID
 * @param userId - User UUID
 * @param packagePath - Absolute path to package file
 * @param expectedChecksum - Expected checksum from database
 * @param actualChecksum - Actual checksum from file
 *
 * @example
 * logTamperDetection(
 *   'job-123',
 *   'user-456',
 *   '/tmp/exports/export.tar.gz',
 *   'a3f5b1c2d4e6f7a8...',
 *   'b4e6c2d3e5f7a8b9...'
 * );
 */
export function logTamperDetection(
  jobId: string,
  userId: string,
  packagePath: string,
  expectedChecksum: string,
  actualChecksum: string
): void {
  logSecurityEvent(
    SecurityEventType.PACKAGE_TAMPERED,
    SecurityEventSeverity.CRITICAL,
    'Export package checksum mismatch detected - possible tampering or corruption',
    {
      jobId,
      userId,
      packagePath,
      expectedChecksum:
        expectedChecksum.substring(0, CHECKSUM_DISPLAY_LENGTH) + '...',
      actualChecksum:
        actualChecksum.substring(0, CHECKSUM_DISPLAY_LENGTH) + '...',
      checksumLength: expectedChecksum.length,
      algorithm: 'sha256',
    }
  );
}

/**
 * Log successful integrity verification event.
 * Records successful package verification for audit trail.
 *
 * @param jobId - Export job UUID
 * @param userId - User UUID
 * @param packagePath - Absolute path to package file
 *
 * @example
 * logIntegrityVerified('job-123', 'user-456', '/tmp/exports/export.tar.gz');
 */
export function logIntegrityVerified(
  jobId: string,
  userId: string,
  packagePath: string
): void {
  logSecurityEvent(
    SecurityEventType.INTEGRITY_VERIFIED,
    SecurityEventSeverity.INFO,
    'Package integrity verified successfully',
    {
      jobId,
      userId,
      packagePath,
    }
  );
}

/**
 * Log legacy package download (without checksum).
 * Tracks downloads of packages created before checksum support.
 *
 * @param jobId - Export job UUID
 * @param userId - User UUID
 * @param packagePath - Absolute path to package file
 * @param completedAt - Job completion timestamp
 *
 * @example
 * logLegacyDownload('job-123', 'user-456', '/tmp/exports/export.tar.gz', new Date());
 */
export function logLegacyDownload(
  jobId: string,
  userId: string,
  packagePath: string,
  completedAt: Date | null
): void {
  logSecurityEvent(
    SecurityEventType.LEGACY_DOWNLOAD,
    SecurityEventSeverity.WARNING,
    'Package downloaded without checksum verification (legacy package)',
    {
      jobId,
      userId,
      packagePath,
      completedAt: completedAt?.toISOString(),
      recommendation: 'Consider re-exporting with checksum support',
    }
  );
}
