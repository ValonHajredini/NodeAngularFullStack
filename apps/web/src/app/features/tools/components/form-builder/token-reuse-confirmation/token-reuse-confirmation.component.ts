import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TokenStatusResponse } from '@nodeangularfullstack/shared';

/**
 * Token reuse confirmation dialog component.
 * Allows users to choose between reusing existing valid tokens or generating new ones.
 */
@Component({
  selector: 'app-token-reuse-confirmation',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, MessageModule],
  templateUrl: './token-reuse-confirmation.component.html',
  styleUrls: ['./token-reuse-confirmation.component.scss'],
})
export class TokenReuseConfirmationComponent {
  /** Whether the confirmation dialog is visible */
  @Input() visible = false;

  /** Token status information from the API */
  @Input() tokenStatus: TokenStatusResponse | null = null;

  /** Emits when dialog visibility changes */
  @Output() visibleChange = new EventEmitter<boolean>();

  /** Emits when user chooses to reuse existing token */
  @Output() reuseToken = new EventEmitter<void>();

  /** Emits when user chooses to generate new token */
  @Output() generateNewToken = new EventEmitter<void>();

  /**
   * Handles dialog visibility change.
   */
  onHide(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  /**
   * Handles reuse token button click.
   */
  onReuseToken(): void {
    this.reuseToken.emit();
    this.onHide();
  }

  /**
   * Handles generate new token button click.
   */
  onGenerateNewToken(): void {
    this.generateNewToken.emit();
    this.onHide();
  }

  /**
   * Gets formatted expiration text.
   * @returns Human-readable expiration status
   */
  get expirationText(): string {
    if (!this.tokenStatus) {
      return '';
    }

    if (this.tokenStatus.tokenExpiration === null) {
      return 'No expiration (permanent token)';
    }

    const expirationDate = new Date(this.tokenStatus.tokenExpiration);
    const now = new Date();
    const diffTime = expirationDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return 'Token expired';
    } else if (diffDays === 1) {
      return 'Expires in 1 day';
    } else if (diffDays <= 30) {
      return `Expires in ${diffDays} days`;
    } else {
      return `Expires on ${expirationDate.toLocaleDateString()}`;
    }
  }

  /**
   * Gets formatted creation date.
   * @returns Human-readable creation date
   */
  get creationText(): string {
    if (!this.tokenStatus) {
      return '';
    }

    const createdDate = new Date(this.tokenStatus.tokenCreatedAt);
    return `Created on ${createdDate.toLocaleDateString()}`;
  }

  /**
   * Gets a truncated form URL for display.
   * @returns Truncated URL for better UI display
   */
  get displayUrl(): string {
    if (!this.tokenStatus?.formUrl) {
      return '';
    }

    const url = this.tokenStatus.formUrl;
    if (url.length <= 60) {
      return url;
    }

    return url.substring(0, 30) + '...' + url.substring(url.length - 27);
  }
}
