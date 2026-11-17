import { AppError } from './app-error.js';

interface AttemptRecord {
  count: number;
  blockedUntil: number | null;
}

const attempts = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutos

export const passwordRateLimiter = {
  check(userId: string) {
    const now = Date.now();
    const record = attempts.get(userId);
    if (record && record.blockedUntil) {
      if (now < record.blockedUntil) {
        const remainingMinutes = Math.ceil((record.blockedUntil - now) / 60000);
        throw new AppError(
          `Muitas tentativas incorretas. Tente novamente em ${remainingMinutes} minutos.`,
          429
        );
      } else {
        // Bloqueio expirado
        attempts.delete(userId);
      }
    }
  },

  recordFailure(userId: string) {
    const now = Date.now();
    const record = attempts.get(userId) || { count: 0, blockedUntil: null };
    record.count += 1;
    if (record.count >= MAX_ATTEMPTS) {
      record.blockedUntil = now + BLOCK_DURATION_MS;
    }
    attempts.set(userId, record);
  },

  recordSuccess(userId: string) {
    attempts.delete(userId);
  },

  reset(userId: string) {
    attempts.delete(userId);
  }
};
