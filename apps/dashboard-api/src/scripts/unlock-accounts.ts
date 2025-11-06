#!/usr/bin/env ts-node
/**
 * Development utility script to unlock user accounts that have been locked
 * due to failed login attempts.
 *
 * Usage:
 *   npx ts-node apps/api/src/scripts/unlock-accounts.ts
 *   npx ts-node apps/api/src/scripts/unlock-accounts.ts admin@example.com
 *
 * Options:
 *   [email] - Specific email to unlock (optional, unlocks all if not provided)
 */

import { AccountLockoutMiddleware } from '../middleware/account-lockout.middleware';

const email = process.argv[2];

if (email) {
  // Unlock specific account
  AccountLockoutMiddleware.unlockAccount(email);
  console.log(`✅ Account unlocked: ${email}`);
} else {
  // Show statistics before unlocking
  const stats = AccountLockoutMiddleware.getStatistics();
  console.log('\n📊 Current Lockout Statistics:');
  console.log(`   Total tracked accounts: ${stats.totalTrackedAccounts}`);
  console.log(`   Locked accounts: ${stats.lockedAccounts}`);
  console.log(
    `   Accounts with failed attempts: ${stats.accountsWithFailedAttempts}`
  );

  // Unlock all test accounts
  const testAccounts = [
    'admin@example.com',
    'user@example.com',
    'readonly@example.com',
  ];

  console.log('\n🔓 Unlocking test accounts...');
  testAccounts.forEach((testEmail) => {
    AccountLockoutMiddleware.unlockAccount(testEmail);
    console.log(`   ✅ ${testEmail}`);
  });

  console.log('\n✨ All test accounts unlocked!\n');
}
