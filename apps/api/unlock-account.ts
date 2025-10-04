import { AccountLockoutMiddleware } from './src/middleware/account-lockout.middleware';

const email = process.argv[2];

if (!email) {
  console.error('Usage: npx ts-node unlock-account.ts <email>');
  process.exit(1);
}

console.log(`Unlocking account: ${email}`);
AccountLockoutMiddleware.unlockAccount(email);
console.log('✅ Account unlocked successfully');

const status = AccountLockoutMiddleware.getLockoutStatus(email);
console.log('Current status:', status);
