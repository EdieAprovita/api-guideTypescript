/**
 * @description Re-exports the shared Winston logger from utils/logger.
 * Provides the canonical import path src/config/logger.ts used by
 * Sprint-3 production-readiness additions (health routes, graceful shutdown).
 * All configuration lives in utils/logger.ts to avoid duplication.
 */
export { default, logInfo, logError, logWarn, logDebug, logFatal, logger } from '../utils/logger.js';
