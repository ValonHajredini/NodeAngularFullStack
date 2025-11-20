/**
 * Email message interface for sending emails.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

/**
 * Email template data for password reset emails.
 */
export interface PasswordResetEmailData {
  userName: string;
  resetLink: string;
  resetToken: string;
  expirationTime: string;
}

/**
 * Email service for sending transactional emails.
 * Currently implements a placeholder for SendGrid integration.
 * In production, this would integrate with SendGrid API for actual email delivery.
 */
export class EmailService {
  private fromEmail: string;
  private isEnabled: boolean;

  constructor() {
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@nodeangularfullstack.com';
    this.isEnabled = process.env.NODE_ENV !== 'test'; // Disable in test environment
  }

  /**
   * Sends a password reset email to the user.
   * @param email - Recipient email address
   * @param resetData - Password reset email data
   * @returns Promise resolving when email is sent
   * @throws {Error} When email sending fails
   * @example
   * await emailService.sendPasswordResetEmail('user@example.com', {
   *   userName: 'John Doe',
   *   resetLink: 'https://app.com/reset-password?token=abc123',
   *   resetToken: 'abc123',
   *   expirationTime: '1 hour'
   * });
   */
  async sendPasswordResetEmail(email: string, resetData: PasswordResetEmailData): Promise<void> {
    try {
      const emailMessage: EmailMessage = {
        to: email,
        from: this.fromEmail,
        subject: 'Password Reset Request - NodeAngularFullStack',
        text: this.generatePasswordResetTextContent(resetData),
        html: this.generatePasswordResetHtmlContent(resetData),
      };

      await this.sendEmail(emailMessage);

      console.log(`📧 Password reset email sent to: ${email}`);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error(`Failed to send password reset email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sends a welcome email to newly registered users.
   * @param email - Recipient email address
   * @param userName - User's full name
   * @returns Promise resolving when email is sent
   * @throws {Error} When email sending fails
   * @example
   * await emailService.sendWelcomeEmail('user@example.com', 'John Doe');
   */
  async sendWelcomeEmail(email: string, userName: string): Promise<void> {
    try {
      const emailMessage: EmailMessage = {
        to: email,
        from: this.fromEmail,
        subject: 'Welcome to NodeAngularFullStack!',
        text: this.generateWelcomeTextContent(userName),
        html: this.generateWelcomeHtmlContent(userName),
      };

      await this.sendEmail(emailMessage);

      console.log(`📧 Welcome email sent to: ${email}`);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      throw new Error(`Failed to send welcome email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sends a generic email message.
   * @param message - Email message data
   * @returns Promise resolving when email is sent
   * @throws {Error} When email sending fails
   * @example
   * await emailService.sendEmail({
   *   to: 'user@example.com',
   *   subject: 'Test Email',
   *   text: 'This is a test email',
   *   html: '<p>This is a test email</p>'
   * });
   */
  async sendEmail(message: EmailMessage): Promise<void> {
    if (!this.isEnabled) {
      console.log(`📧 [MOCK] Email would be sent to: ${message.to}`);
      console.log(`📧 [MOCK] Subject: ${message.subject}`);
      console.log(`📧 [MOCK] Content: ${message.text || message.html}`);
      return;
    }

    try {
      // PLACEHOLDER: In production, implement actual SendGrid integration
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      // await sgMail.send(message);

      // For now, just log the email (placeholder implementation)
      console.log(`📧 [PLACEHOLDER] Sending email to: ${message.to}`);
      console.log(`📧 [PLACEHOLDER] Subject: ${message.subject}`);
      console.log(`📧 [PLACEHOLDER] From: ${message.from || this.fromEmail}`);

      // TODO: Replace with actual SendGrid implementation:
      /*
      const msg = {
        to: message.to,
        from: message.from || this.fromEmail,
        subject: message.subject,
        text: message.text,
        html: message.html,
      };

      await sgMail.send(msg);
      */

      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error(`Email sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generates plain text content for password reset email.
   * @param resetData - Password reset email data
   * @returns Plain text email content
   */
  private generatePasswordResetTextContent(resetData: PasswordResetEmailData): string {
    return `
Hello ${resetData.userName},

You have requested a password reset for your NodeAngularFullStack account.

To reset your password, please click the following link or copy and paste it into your browser:
${resetData.resetLink}

This link will expire in ${resetData.expirationTime}.

If you did not request this password reset, please ignore this email. Your password will remain unchanged.

For security reasons, please do not share this email or reset link with anyone.

Best regards,
The NodeAngularFullStack Team

---
If you're having trouble with the link above, copy and paste this token into the password reset form:
${resetData.resetToken}
    `.trim();
  }

  /**
   * Generates HTML content for password reset email.
   * @param resetData - Password reset email data
   * @returns HTML email content
   */
  private generatePasswordResetHtmlContent(resetData: PasswordResetEmailData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - NodeAngularFullStack</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f4f4f4; padding: 20px; text-align: center; border-radius: 5px; }
        .content { padding: 20px 0; }
        .button { display: inline-block; background-color: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .button:hover { background-color: #005a87; }
        .footer { font-size: 0.9em; color: #666; border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px; }
        .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .token { background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 10px; border-radius: 3px; font-family: monospace; word-break: break-all; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Password Reset Request</h1>
    </div>

    <div class="content">
        <p>Hello <strong>${resetData.userName}</strong>,</p>

        <p>You have requested a password reset for your NodeAngularFullStack account.</p>

        <p>To reset your password, please click the button below:</p>

        <a href="${resetData.resetLink}" class="button">Reset Your Password</a>

        <p>This link will expire in <strong>${resetData.expirationTime}</strong>.</p>

        <div class="warning">
            <strong>Security Notice:</strong> If you did not request this password reset, please ignore this email. Your password will remain unchanged.
        </div>

        <p>For security reasons, please do not share this email or reset link with anyone.</p>
    </div>

    <div class="footer">
        <p>If you're having trouble with the button above, copy and paste this token into the password reset form:</p>
        <div class="token">${resetData.resetToken}</div>

        <p>Best regards,<br>
        The NodeAngularFullStack Team</p>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generates plain text content for welcome email.
   * @param userName - User's full name
   * @returns Plain text email content
   */
  private generateWelcomeTextContent(userName: string): string {
    return `
Hello ${userName},

Welcome to NodeAngularFullStack!

Your account has been successfully created. You can now log in and start using all the features available to you.

Here are some things you can do to get started:
- Complete your profile information
- Explore the dashboard
- Check out our documentation

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
The NodeAngularFullStack Team
    `.trim();
  }

  /**
   * Generates HTML content for welcome email.
   * @param userName - User's full name
   * @returns HTML email content
   */
  private generateWelcomeHtmlContent(userName: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to NodeAngularFullStack</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f4f4f4; padding: 20px; text-align: center; border-radius: 5px; }
        .content { padding: 20px 0; }
        .welcome { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { font-size: 0.9em; color: #666; border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px; }
        ul { padding-left: 20px; }
        li { margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Welcome to NodeAngularFullStack!</h1>
    </div>

    <div class="content">
        <div class="welcome">
            <p><strong>Hello ${userName},</strong></p>
            <p>Your account has been successfully created! 🎉</p>
        </div>

        <p>You can now log in and start using all the features available to you.</p>

        <p><strong>Here are some things you can do to get started:</strong></p>
        <ul>
            <li>Complete your profile information</li>
            <li>Explore the dashboard</li>
            <li>Check out our documentation</li>
        </ul>

        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
    </div>

    <div class="footer">
        <p>Best regards,<br>
        <strong>The NodeAngularFullStack Team</strong></p>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Validates email configuration.
   * @returns Boolean indicating if email service is properly configured
   */
  isConfigured(): boolean {
    // In production, check for SendGrid API key
    // return !!process.env.SENDGRID_API_KEY;

    // For placeholder implementation, always return true
    return true;
  }

  /**
   * Gets email service status and configuration.
   * @returns Email service status information
   */
  getStatus(): {
    enabled: boolean;
    configured: boolean;
    fromEmail: string;
    provider: string;
  } {
    return {
      enabled: this.isEnabled,
      configured: this.isConfigured(),
      fromEmail: this.fromEmail,
      provider: 'placeholder', // Would be 'sendgrid' in production
    };
  }
}

// Export singleton instance
export const emailService = new EmailService();