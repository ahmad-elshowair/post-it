import { PoolClient, QueryResult } from 'pg';
import pool from '../database/pool.js';
import { TBookmark } from '../types/bookmark.js';

class BookmarkModel {
  /**
   * Validate required fields for a bookmark action.
   * @param fields - key-value map of fields to validate
   * @param fieldsNames - names of required fields
   * @throws {Error} if any required fields are missing
   */
  private validateRequiredFields(fields: Record<string, unknown>, fieldsNames: string[]): void {
    const missingFields = fieldsNames.filter((fieldName) => !fields[fieldName]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')} are required`);
    }
  }

  /**
   * Toggle bookmark status for a post. Creates bookmark if absent, removes if present.
   * @param userId - the authenticated user's ID
   * @param postId - the post to bookmark/unbookmark
   * @returns bookmark record on add, or confirmation on remove
   * @throws {Error} if post not found or operation fails
   * @route POST /api/bookmarks/:post_id
   */
  async toggle(
    userId: string,
    postId: string,
  ): Promise<{ bookmark_id: string; action: 'bookmarked' | 'unbookmarked' }> {
    this.validateRequiredFields({ user_id: userId, post_id: postId }, ['user_id', 'post_id']);

    const connection: PoolClient = await pool.connect();
    try {
      await connection.query('BEGIN');

      const checkSql = `
        SELECT
          p.post_id,
          b.user_id AS bookmarked_by_user,
          b.bookmark_id
        FROM
          posts p
        LEFT JOIN
          bookmarks b ON p.post_id = b.post_id AND b.user_id = $2
        WHERE p.post_id = $1
      `;

      const status: QueryResult = await connection.query(checkSql, [postId, userId]);

      if (status.rowCount === 0) {
        throw new Error('Post not found');
      }

      const row = status.rows[0];
      const isAlreadyBookmarked = !!row.bookmarked_by_user;

      if (isAlreadyBookmarked) {
        const deleteSql = `
          DELETE FROM bookmarks
          WHERE post_id = $1 AND user_id = $2
          RETURNING bookmark_id
        `;
        const deleted: QueryResult = await connection.query(deleteSql, [postId, userId]);
        await connection.query('COMMIT');
        return { bookmark_id: deleted.rows[0].bookmark_id, action: 'unbookmarked' };
      } else {
        const insertSql = `
          INSERT INTO bookmarks (user_id, post_id)
          VALUES ($1, $2)
          RETURNING bookmark_id
        `;
        const inserted: QueryResult = await connection.query(insertSql, [userId, postId]);
        await connection.query('COMMIT');
        return { bookmark_id: inserted.rows[0].bookmark_id, action: 'bookmarked' };
      }
    } catch (error) {
      await connection.query('ROLLBACK');
      console.error('[BOOKMARK MODEL] toggle error', error);
      throw new Error(`Bookmark toggle failed: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * Get paginated bookmarks for a user, ordered by most recently saved first.
   * @param userId - the bookmark owner's ID
   * @param limit - max results per page (already +1 for has_more detection)
   * @param cursor - bookmark_id of the last item from previous page
   * @param direction - pagination direction
   * @returns array of bookmarks for the requesting user
   */
  async getUserBookmarks(
    userId: string,
    limit: number = 20,
    cursor?: string,
    direction: 'next' | 'previous' = 'next',
  ): Promise<TBookmark[]> {
    this.validateRequiredFields({ user_id: userId }, ['user_id']);

    const connection: PoolClient = await pool.connect();
    try {
      const params: (string | number)[] = [userId];

      let sql = `
        SELECT
          bookmark_id,
          user_id,
          post_id,
          created_at
        FROM
          bookmarks
        WHERE
          user_id = $1
      `;

      if (cursor) {
        const cursorCheck = await connection.query(
          `SELECT created_at FROM bookmarks WHERE bookmark_id = $1`,
          [cursor],
        );

        if (cursorCheck.rows.length > 0) {
          const timestamp = cursorCheck.rows[0].created_at;
          if (direction === 'next') {
            sql += ` AND created_at < $2`;
          } else {
            sql += ` AND created_at > $2`;
          }
          params.push(timestamp);
        } else {
          console.warn(`Bookmark with ID ${cursor} not found for pagination`);
        }
      }

      sql +=
        direction === 'next'
          ? ' ORDER BY created_at DESC, bookmark_id DESC'
          : ' ORDER BY created_at ASC, bookmark_id ASC';

      sql += ` LIMIT $${params.length + 1}`;
      params.push(limit);

      const result: QueryResult<TBookmark> = await connection.query(sql, params);

      return direction === 'previous' ? result.rows.reverse() : result.rows;
    } catch (error) {
      console.error('[BOOKMARK MODEL] getUserBookmarks error', error);
      throw new Error(`Failed to get user bookmarks: ${(error as Error).message}`, {
        cause: error,
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Check if a user has bookmarked a specific post.
   * @param userId - the authenticated user's ID
   * @param postId - the post to check
   * @returns whether the user has bookmarked the post
   */
  async isBookmarked(userId: string, postId: string): Promise<{ isBookmarked: boolean }> {
    this.validateRequiredFields({ user_id: userId, post_id: postId }, ['user_id', 'post_id']);

    const connection: PoolClient = await pool.connect();
    try {
      const sql = `
        SELECT 1
        FROM bookmarks
        WHERE user_id = $1 AND post_id = $2
      `;
      const result: QueryResult = await connection.query(sql, [userId, postId]);

      return { isBookmarked: result.rows.length > 0 };
    } catch (error) {
      console.error('[BOOKMARK MODEL] isBookmarked error', error);
      throw new Error(`Failed to check bookmark: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }
}

export default BookmarkModel;
