import cron from 'node-cron';
import RefreshTokenModel from '../models/refreshToken.js';

const refresh_token_model = new RefreshTokenModel();

export const scheduledTokenCleanup = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      const deletedCount = await refresh_token_model.removeExpiredTokens();
      console.log(`Deleted ${deletedCount} expired refresh tokens`);
    } catch (error) {
      console.error('Error removing expired tokens:', error);
    }
  });
};
