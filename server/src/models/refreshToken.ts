import { QueryResult } from 'pg';
import pool from '../database/pool.js';
import { RefreshToken } from '../types/refreshToken.js';

class RefreshTokenModel {
  async createToken(userId: string, fingerprintHash: string, expiresAt: Date): Promise<string> {
    // connect to the database
    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');
      // create token query
      const sql =
        'INSERT INTO refresh_tokens (user_id, fingerprint_hash, expires_at) VALUES($1, $2, $3) RETURNING *';

      const values = [userId, fingerprintHash, expiresAt];

      // insert token data
      const result: QueryResult<RefreshToken> = await connection.query(sql, values);
      await connection.query('COMMIT');
      // return token
      return result.rows[0].token_id;
    } catch (error) {
      await connection.query('ROLLBACK');
      console.error('error creating refresh token', error);
      throw new Error(`create refresh token model error: ${(error as Error).message}`, {
        cause: error,
      });
    } finally {
      connection.release();
    }
  }

  async verifyToken(userId: string, fingerprintHash: string): Promise<boolean> {
    const connection = await pool.connect();
    try {
      const sql = `SELECT * FROM refresh_tokens
        WHERE user_id = $1
        AND fingerprint_hash = $2
        AND is_revoked = false
        AND expires_at > $3`;

      const values = [userId, fingerprintHash, new Date()];

      const result: QueryResult<RefreshToken> = await connection.query(sql, values);
      return result.rows.length > 0;
    } catch (error) {
      console.error('error verifying refresh token', error);
      throw new Error(`verify refresh token model error: ${(error as Error).message}`, {
        cause: error,
      });
    } finally {
      connection.release();
    }
  }

  async rotateToken(
    userId: string,
    oldFingerprintHash: string,
    newFingerprintHash: string,
    expiresAt: Date,
  ): Promise<string> {
    // connect to the database
    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');

      // rotate token query
      const sql = `
        UPDATE refresh_tokens
        SET is_revoked = true, revoked_at = $1
        WHERE user_id = $2 AND fingerprint_hash = $3 AND is_revoked = false
      `;

      const values = [new Date(), userId, oldFingerprintHash];

      await connection.query(sql, values);

      // Create new token
      const newTokenId = await this.createToken(userId, newFingerprintHash, expiresAt);
      // Commit transaction
      await connection.query('COMMIT');
      // return token
      return newTokenId;
    } catch (error) {
      // Rollback transaction on error.
      await connection.query('ROLLBACK');
      console.error('error rotating refresh token', error);
      throw new Error(`rotate refresh token model error: ${(error as Error).message}`, {
        cause: error,
      });
    } finally {
      connection.release();
    }
  }

  async revokeAllUserTokens(userId: string): Promise<number | null> {
    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');
      const sql = `
        UPDATE refresh_tokens
        SET is_revoked = true, revoked_at = $1
        WHERE user_id = $2 AND is_revoked = false
      `;
      const values = [new Date(), userId];
      const result = await connection.query(sql, values);

      await connection.query('COMMIT');

      // Return the number of revoked tokens
      return result.rowCount;
    } catch (error) {
      await connection.query('ROLLBACK');
      console.error('error revoking all user tokens', error);
      throw new Error(`revoke all user tokens model error: ${(error as Error).message}`, {
        cause: error,
      });
    } finally {
      connection.release();
    }
  }

  // Cleans up expired tokens to maintain database performance.

  async removeExpiredTokens(): Promise<number | null> {
    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');
      const sql = `
      DELETE FROM refresh_tokens
      WHERE expires_at < $1
      `;

      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() - 7);

      const result = await connection.query(sql, [expireDate]);

      await connection.query('COMMIT');

      // Return the number of deleted tokens
      return result.rowCount;
    } catch (error) {
      await connection.query('ROLLBACK');
      console.error('error removing all expired token', error);
      throw new Error(`remove expired token model error: ${(error as Error).message}`, {
        cause: error,
      });
    } finally {
      connection.release();
    }
  }
}

export default RefreshTokenModel;
