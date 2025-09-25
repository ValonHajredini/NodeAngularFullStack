import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  ApiTokenRepository,
  ApiTokenEntity,
  CreateApiTokenData,
  UpdateApiTokenData,
} from '../repositories/api-token.repository';
import { usersRepository } from '../repositories/users.repository';
import {
  CreateApiTokenRequest,
  CreateApiTokenResponse,
  ApiTokenListResponse,
} from '@nodeangularfullstack/shared';

/**
 * API token generation result interface.
 */
export interface TokenGenerationResult {
  plainToken: string;
  hashedToken: string;
}

/**
 * API token validation result interface.
 */
export interface TokenValidationResult {
  isValid: boolean;
  token?: ApiTokenEntity;
  user?: any;
  tenant?: any;
}

/**
 * API token service for managing API token lifecycle.
 * Handles token generation, validation, and CRUD operations with security best practices.
 */
export class ApiTokenService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly TOKEN_LENGTH = 32; // 32 bytes = 64 hex characters
  private static readonly VALID_SCOPES = ['read', 'write'];

  private apiTokenRepository: ApiTokenRepository;

  constructor() {
    this.apiTokenRepository = new ApiTokenRepository();
  }

  /**
   * Generates a secure API token and its hash.
   * @returns Promise containing plain token and its hash
   * @example
   * const { plainToken, hashedToken } = await apiTokenService.generateToken();
   * // plainToken: raw token to return to user (only shown once)
   * // hashedToken: hashed version to store in database
   */
  private async generateToken(): Promise<TokenGenerationResult> {
    try {
      // Generate cryptographically secure random token
      const plainToken = crypto
        .randomBytes(ApiTokenService.TOKEN_LENGTH)
        .toString('hex');

      // Hash token using bcrypt for secure storage
      const hashedToken = await bcrypt.hash(
        plainToken,
        ApiTokenService.SALT_ROUNDS
      );

      return { plainToken, hashedToken };
    } catch (error) {
      throw new Error(
        `Token generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validates token scopes against allowed values.
   * @param scopes - Array of scope strings to validate
   * @returns boolean indicating if all scopes are valid
   */
  private validateScopes(scopes: string[]): boolean {
    if (!Array.isArray(scopes) || scopes.length === 0) {
      return false;
    }

    return scopes.every((scope) =>
      ApiTokenService.VALID_SCOPES.includes(scope)
    );
  }

  /**
   * Creates a new API token for a user.
   * @param userId - User ID to create token for
   * @param request - Token creation request data
   * @param tenantId - Optional tenant ID for multi-tenant mode
   * @returns Promise containing token creation response with plaintext token
   * @throws {Error} When token creation fails or validation errors occur
   * @example
   * const tokenResponse = await apiTokenService.createToken('user-uuid', {
   *   name: 'Production API Token',
   *   scopes: ['read', 'write']
   * }, 'tenant-uuid');
   */
  async createToken(
    userId: string,
    request: CreateApiTokenRequest,
    tenantId?: string
  ): Promise<CreateApiTokenResponse> {
    try {
      // Validate input
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!request.name || request.name.trim().length === 0) {
        throw new Error('Token name is required');
      }

      if (request.name.length > 100) {
        throw new Error('Token name must be 100 characters or less');
      }

      if (!this.validateScopes(request.scopes)) {
        throw new Error(
          `Invalid scopes. Valid scopes are: ${ApiTokenService.VALID_SCOPES.join(', ')}`
        );
      }

      // Verify user exists
      const user = await usersRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user has permission in tenant context if applicable
      if (tenantId && user.tenantId !== tenantId) {
        throw new Error('User does not belong to specified tenant');
      }

      // Generate secure token
      const { plainToken, hashedToken } = await this.generateToken();

      // Set expiration date (default 1 year from now)
      const expiresAt =
        request.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      // Ensure expiration is in the future
      if (expiresAt <= new Date()) {
        throw new Error('Expiration date must be in the future');
      }

      // Create token data
      const tokenData: CreateApiTokenData = {
        userId,
        tenantId,
        tokenHash: hashedToken,
        name: request.name.trim(),
        scopes: [...request.scopes], // Create copy to avoid mutation
        expiresAt,
      };

      // Save token to database
      const createdToken = await this.apiTokenRepository.create(tokenData);

      // Return response with plaintext token (only time it's shown)
      return {
        token: plainToken,
        id: createdToken.id,
        name: createdToken.name,
        scopes: createdToken.scopes,
        expiresAt: createdToken.expiresAt.toISOString(),
      };
    } catch (error) {
      throw new Error(
        `Token creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validates an API token and returns validation result.
   * @param plainToken - The plaintext token to validate
   * @returns Promise containing validation result with token and user data
   * @example
   * const validation = await apiTokenService.validateToken(plainToken);
   * if (validation.isValid) {
   *   console.log('Token is valid for user:', validation.user.email);
   *   // Update last used timestamp
   * }
   */
  async validateToken(plainToken: string): Promise<TokenValidationResult> {
    try {
      if (!plainToken) {
        return { isValid: false };
      }

      // Hash the provided token to find matching stored token
      // Note: We need to find by scanning all tokens since we can't reverse the hash
      // This is a limitation of bcrypt - we'll implement a more efficient method below

      // For now, let's implement a secure but less efficient approach
      // In production, consider adding a token prefix or using a different approach
      const allTokens = await this.getAllActiveTokens();

      let validToken: ApiTokenEntity | undefined;

      // Check each active token hash
      for (const token of allTokens) {
        try {
          const isMatch = await bcrypt.compare(plainToken, token.tokenHash);
          if (isMatch) {
            validToken = token;
            break;
          }
        } catch (error) {
          // Continue checking other tokens if one fails
          continue;
        }
      }

      if (!validToken) {
        return { isValid: false };
      }

      // Check if token is active
      if (!validToken.isActive) {
        return { isValid: false };
      }

      // Check if token is expired
      if (validToken.expiresAt < new Date()) {
        return { isValid: false };
      }

      // Get user data
      const user = await usersRepository.findById(validToken.userId);
      if (!user || !user.isActive) {
        return { isValid: false };
      }

      // Update last used timestamp (fire and forget)
      this.apiTokenRepository
        .updateLastUsed(validToken.tokenHash)
        .catch((error) => {
          console.error('Failed to update token last used timestamp:', error);
        });

      return {
        isValid: true,
        token: validToken,
        user,
        tenant: validToken.tenantId ? { id: validToken.tenantId } : undefined,
      };
    } catch (error) {
      console.error('Token validation error:', error);
      return { isValid: false };
    }
  }

  /**
   * Gets all active tokens for efficient validation scanning.
   * This is a temporary helper method - in production consider token indexing strategies.
   * @returns Promise containing array of active tokens
   */
  private async getAllActiveTokens(): Promise<ApiTokenEntity[]> {
    // This is a simplified implementation for the story requirements
    // In production, implement pagination and more efficient querying
    try {
      // We'll need to add this method to the repository
      const query = `
        SELECT
          id, user_id as "userId", tenant_id as "tenantId", token_hash as "tokenHash",
          name, scopes, expires_at as "expiresAt",
          created_at as "createdAt", updated_at as "updatedAt",
          last_used_at as "lastUsedAt", is_active as "isActive"
        FROM api_tokens
        WHERE is_active = true AND expires_at > CURRENT_TIMESTAMP
      `;

      const client = await this.apiTokenRepository['pool'].connect();
      try {
        const result = await client.query(query);
        return result.rows as ApiTokenEntity[];
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Failed to fetch active tokens:', error);
      return [];
    }
  }

  /**
   * Lists all API tokens for a user (without token values).
   * @param userId - User ID to get tokens for
   * @param tenantId - Optional tenant ID for filtering
   * @returns Promise containing array of token information
   * @example
   * const tokens = await apiTokenService.listTokens('user-uuid', 'tenant-uuid');
   * tokens.forEach(token => console.log(token.name, token.lastUsedAt));
   */
  async listTokens(
    userId: string,
    tenantId?: string
  ): Promise<ApiTokenListResponse[]> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const tokens = await this.apiTokenRepository.findByUserId(
        userId,
        tenantId
      );

      return tokens.map((token) => ({
        id: token.id,
        name: token.name,
        scopes: token.scopes,
        expiresAt: token.expiresAt.toISOString(),
        createdAt: token.createdAt.toISOString(),
        lastUsedAt: token.lastUsedAt?.toISOString(),
        isActive: token.isActive,
      }));
    } catch (error) {
      throw new Error(
        `Token listing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Deletes (revokes) an API token.
   * @param tokenId - Token ID to delete
   * @param userId - User ID that owns the token (for authorization)
   * @param tenantId - Optional tenant ID for filtering
   * @returns Promise containing true if deleted, false if not found
   * @example
   * const deleted = await apiTokenService.deleteToken('token-uuid', 'user-uuid', 'tenant-uuid');
   * if (deleted) {
   *   console.log('Token revoked successfully');
   * }
   */
  async deleteToken(
    tokenId: string,
    userId: string,
    tenantId?: string
  ): Promise<boolean> {
    try {
      if (!tokenId || !userId) {
        throw new Error('Token ID and User ID are required');
      }

      // First verify the token belongs to the user
      const token = await this.apiTokenRepository.findById(tokenId, tenantId);
      if (!token || token.userId !== userId) {
        return false; // Token not found or doesn't belong to user
      }

      return await this.apiTokenRepository.delete(tokenId, tenantId);
    } catch (error) {
      throw new Error(
        `Token deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Updates an API token's metadata (not the token value itself).
   * @param tokenId - Token ID to update
   * @param userId - User ID that owns the token (for authorization)
   * @param updateData - Fields to update
   * @param tenantId - Optional tenant ID for filtering
   * @returns Promise containing updated token data or null if not found
   * @example
   * const updatedToken = await apiTokenService.updateToken('token-uuid', 'user-uuid', {
   *   name: 'Updated Token Name',
   *   scopes: ['read']
   * });
   */
  async updateToken(
    tokenId: string,
    userId: string,
    updateData: UpdateApiTokenData,
    tenantId?: string
  ): Promise<ApiTokenListResponse | null> {
    try {
      if (!tokenId || !userId) {
        throw new Error('Token ID and User ID are required');
      }

      // Validate scopes if provided
      if (updateData.scopes && !this.validateScopes(updateData.scopes)) {
        throw new Error(
          `Invalid scopes. Valid scopes are: ${ApiTokenService.VALID_SCOPES.join(', ')}`
        );
      }

      // Validate token name if provided
      if (updateData.name !== undefined) {
        if (!updateData.name || updateData.name.trim().length === 0) {
          throw new Error('Token name cannot be empty');
        }
        if (updateData.name.length > 100) {
          throw new Error('Token name must be 100 characters or less');
        }
        updateData.name = updateData.name.trim();
      }

      // First verify the token belongs to the user
      const existingToken = await this.apiTokenRepository.findById(
        tokenId,
        tenantId
      );
      if (!existingToken || existingToken.userId !== userId) {
        return null; // Token not found or doesn't belong to user
      }

      const updatedToken = await this.apiTokenRepository.update(
        tokenId,
        updateData,
        tenantId
      );

      if (!updatedToken) {
        return null;
      }

      return {
        id: updatedToken.id,
        name: updatedToken.name,
        scopes: updatedToken.scopes,
        expiresAt: updatedToken.expiresAt.toISOString(),
        createdAt: updatedToken.createdAt.toISOString(),
        lastUsedAt: updatedToken.lastUsedAt?.toISOString(),
        isActive: updatedToken.isActive,
      };
    } catch (error) {
      throw new Error(
        `Token update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Checks if a token has the required scope for an operation.
   * @param token - Token entity to check
   * @param requiredScope - Required scope ('read' or 'write')
   * @returns boolean indicating if token has the required scope
   * @example
   * if (apiTokenService.hasScope(token, 'write')) {
   *   // Allow write operation
   * }
   */
  hasScope(token: ApiTokenEntity, requiredScope: string): boolean {
    return token.scopes.includes(requiredScope);
  }
}

// Export singleton instance
export const apiTokenService = new ApiTokenService();
