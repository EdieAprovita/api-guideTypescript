import { execSync } from 'child_process';
try {
  execSync('npx vitest run src/test/integration/user.integration.test.ts --config vitest.integration.config.mts', { stdio: 'inherit' });
} catch (e) {
  process.exit(1);
}
