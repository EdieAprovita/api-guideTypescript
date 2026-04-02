/**
 * Shared Redis reconnection strategy with exponential backoff.
 *
 * Returns the delay in ms before the next reconnection attempt.
 * Returning `null` stops retrying after 10 failed attempts.
 *
 * @param times - Number of reconnection attempts made so far.
 */
export function redisRetryStrategy(times: number): number | null {
    if (times > 10) return null;
    return Math.min(times * 200, 3000);
}
