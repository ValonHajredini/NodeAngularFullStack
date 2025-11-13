/**
 * Poll Template Executor
 *
 * Implements duplicate vote prevention using session-based tracking.
 * Validates votes using session IDs from Express session middleware.
 * Aggregates poll results via PostgreSQL JSONB queries.
 *
 * Epic 29: Form Template System with Business Logic
 * Story 29.14: Poll Template with Vote Aggregation
 *
 * @implements {ITemplateExecutor}
 * @source docs/architecture/backend-architecture.md (Strategy Pattern, Session Management)
 */

import { PoolClient } from 'pg';
import {
  ITemplateExecutor,
  ExecutorValidation,
  ExecutorResult,
} from './base-executor.interface';
import {
  PollLogicConfig,
  PollVoteMetadata,
  PollResults,
} from '@nodeangularfullstack/shared';
import { FormSubmissionsRepository } from '../../repositories/form-submissions.repository';

/**
 * Poll executor with duplicate vote prevention
 * Uses session-based tracking to prevent multiple votes from same user
 */
export class PollExecutor implements ITemplateExecutor {
  /**
   * @param submissionsRepo - Form submissions repository for database operations
   * @param sessionId - Session ID from req.session.id for duplicate tracking
   */
  constructor(
    private readonly submissionsRepo: FormSubmissionsRepository,
    private readonly sessionId: string
  ) {}

  /**
   * Validate poll vote submission
   * Checks vote field presence and duplicate prevention
   *
   * @param submission - Form submission data (not yet persisted)
   * @param _template - Template configuration (unused)
   * @param config - Poll logic configuration
   * @returns Promise containing validation result
   */
  async validate(
    submission: Partial<any>,
    _template: any,
    config: PollLogicConfig
  ): Promise<ExecutorValidation> {
    const errors: string[] = [];
    const data = submission.data as Record<string, any>;

    // Validate vote field presence
    const vote = data[config.voteField];
    if (!vote || typeof vote !== 'string' || vote.trim() === '') {
      errors.push(`Vote field '${config.voteField}' is required`);
    }

    // Validate tracking method
    if (!['session', 'ip', 'fingerprint'].includes(config.trackingMethod)) {
      errors.push(
        'Invalid tracking method. Must be: session, ip, or fingerprint'
      );
    }

    // Check duplicate vote if prevention enabled
    if (config.preventDuplicates && submission.form_id) {
      const hasDuplicate = await this.checkDuplicateVote(
        submission.form_id,
        this.sessionId
      );

      if (hasDuplicate) {
        errors.push('You have already voted in this poll');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Execute poll vote submission
   * Stores vote with session tracking metadata and optionally returns poll results
   *
   * @param submission - Created form submission record (persisted)
   * @param _template - Template configuration (unused)
   * @param config - Poll logic configuration
   * @param _client - Optional database client (unused for poll, required by interface)
   * @returns Promise containing executor result with vote confirmation and optional results
   */
  async execute(
    submission: any,
    _template: any,
    config: PollLogicConfig,
    _client?: PoolClient
  ): Promise<ExecutorResult> {
    const data = submission.data as Record<string, any>;
    const voteValue = data[config.voteField];

    // Prepare vote metadata
    const metadata: PollVoteMetadata = {
      session_id: this.sessionId,
      voted_at: new Date().toISOString(),
      vote_value: voteValue,
    };

    // Prepare result
    const result: ExecutorResult = {
      success: true,
      data: metadata,
      message: 'Vote recorded successfully',
    };

    // Include poll results if configured
    if (config.showResultsAfterVote) {
      const pollResults = await this.aggregateVotes(
        submission.form_id,
        config.voteField
      );
      result.data = {
        ...result.data,
        poll_results: pollResults,
      };
    }

    return result;
  }

  /**
   * Check if session has already voted
   *
   * @param formId - Form UUID
   * @param sessionId - Session ID
   * @returns Promise resolving to true if duplicate vote detected
   * @private
   */
  private async checkDuplicateVote(
    formId: string,
    sessionId: string
  ): Promise<boolean> {
    const count = await this.submissionsRepo.checkDuplicateBySession(
      formId,
      sessionId
    );
    return count > 0;
  }

  /**
   * Aggregate poll votes by option
   * Queries all submissions for this form and counts votes per option
   *
   * @param formId - Form UUID
   * @param voteField - Field ID of vote question
   * @returns Promise containing poll results with vote counts and percentages
   * @private
   */
  private async aggregateVotes(
    formId: string,
    voteField: string
  ): Promise<PollResults> {
    const results = await this.submissionsRepo.aggregatePollVotes(
      formId,
      voteField
    );

    const totalVotes = results.reduce((sum, r) => sum + r.count, 0);

    const voteCounts: Record<string, number> = {};
    const votePercentages: Record<string, number> = {};

    results.forEach((r) => {
      voteCounts[r.vote_value] = r.count;
      votePercentages[r.vote_value] =
        totalVotes > 0 ? Math.round((r.count / totalVotes) * 100) : 0;
    });

    return {
      total_votes: totalVotes,
      vote_counts: voteCounts,
      vote_percentages: votePercentages,
      user_voted: true,
      user_vote: undefined, // Will be set by service layer if needed
    };
  }
}
