import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

async function runSeeds(): Promise<void> {
  console.log('🌱 Running database seeds...');

  try {
    const seedsDir = path.join(__dirname);
    const seedFile = path.join(seedsDir, '001_seed_test_links.ts');

    console.log(`▶️  Executing seed file...`);
    await execAsync(`ts-node ${seedFile}`);

    console.log('🎉 All seeds completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

// Run seeds
runSeeds().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
