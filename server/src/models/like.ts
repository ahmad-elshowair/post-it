import { PoolClient, QueryResult } from 'pg';
import pool from '../database/pool.js';
import { Like, TUsersLike } from '../types/like.js';

class LikeModel {
  /**
   * Validate required fields for a like action.
   * @param {Record<string, unknown>} fields
   * @param {string[]} fieldsNames
   * @returns {void}
   * @throws {Error} Error if required fields are missing
   */
  private validateRequiredFields(fields: Record<string, unknown>, fieldsNames: string[]): void {
    const missingFields = fieldsNames.filter((fieldName) => !fields[fieldName]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')} are required`);
    }
  }
  /**
   * Toggle like Status for a post .
   * @param {Like} like
   * @returns {Promise<{ message: string; action: "liked" | "unliked" }>}
   * @throws {Error} Error if required fields are missing or operation fails
   */
  async like(like: Like): Promise<{ message: string; action: 'liked' | 'unliked' }> {
    this.validateRequiredFields(like, ['post_id', 'user_id']);

    const connection: PoolClient = await pool.connect();
    try {
      await connection.query('BEGIN');

      const postCheckSql = `
	  	SELECT 
	  		p.*,
			l.user_id AS liked_by_user 
		FROM
			posts p 
		LEFT JOIN
			likes l ON p.post_id = l.post_id AND l.user_id = $2
		WHERE p.post_id = $1`;

      const postAndLikeStatus: QueryResult = await connection.query(postCheckSql, [
        like.post_id,
        like.user_id,
      ]);

      // If the post does not exist, return an error message
      if (postAndLikeStatus.rowCount === 0) {
        throw new Error('Post not found');
      }

      const post = postAndLikeStatus.rows[0];
      const isAlreadyLiked = !!post.liked_by_user;
      let message: string;
      let action: 'liked' | 'unliked';

      if (isAlreadyLiked) {
        // UNLIKE THE POST.
        const unlikeSql = `
			    DELETE FROM likes
			    WHERE post_id = $1 AND user_id = $2
			`;
        await connection.query(unlikeSql, [like.post_id, like.user_id]);
        message = 'Like removed successfully';
        action = 'unliked';
      } else {
        // LIKE THE POST.
        const likeSql = `
				  INSERT INTO likes (user_id, post_id)
				  VALUES ($1, $2)`;

        await connection.query(likeSql, [like.user_id, like.post_id]);
        message = 'Post liked successfully';
        action = 'liked';
      }

      // UPDATE THE number_of_likes OF A POST.
      const updateLikeCountSql = `
			UPDATE posts
			SET
				number_of_likes = number_of_likes ${isAlreadyLiked ? '-1' : '+1'},
				updated_at = NOW()
			WHERE post_id = $1`;
      await connection.query(updateLikeCountSql, [like.post_id]);

      await connection.query('COMMIT');
      return { message, action };
    } catch (error) {
      await connection.query('ROLLBACK');
      console.error('[LIKE MODEL] like error', error);
      throw new Error(`Like operation failed: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * Check if a user has liked a post.
   * @param {string} user_id - The id of the user.
   * @param {string} post_id - The id of the post.
   * @returns {Promise<{ isLiked: boolean }>}
   * @throws {Error} Error if required fields are missing or operation fails
   */
  async checkIfLiked(user_id: string, post_id: string): Promise<{ isLiked: boolean }> {
    this.validateRequiredFields({ user_id, post_id }, ['user_id', 'post_id']);

    const connection: PoolClient = await pool.connect();

    try {
      const sql = `
				SELECT 1
				FROM likes
				WHERE user_id = $1 AND post_id = $2
    `;
      const result: QueryResult<Record<string, unknown>> = await connection.query(sql, [
        user_id,
        post_id,
      ]);

      return { isLiked: result.rows.length > 0 };
    } catch (error) {
      console.error('[LIKE MODEL] checkIfLiked error', error);
      throw new Error(`Failed to check like: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * Get all likes for a post with user details.
   * @param {string} post_id - The id of the post.
   * @param {number} limit - The number of likes to return.
   * @param {string} cursor - The cursor to use for pagination.
   * @param {"next" | "previous"} direction - The direction to use for pagination.
   * @returns {Promise<{ users: TUsersLike[] }>}
   * @throws {Error} Error if required fields are missing or operation fails
   */
  async getLikesByPostId(
    post_id: string,
    limit: number = 10,
    cursor: string,
    direction: 'next' | 'previous' = 'next',
  ): Promise<{ users: TUsersLike[] }> {
    this.validateRequiredFields({ post_id }, ['post_id']);

    const connection: PoolClient = await pool.connect();
    try {
      const params: (string | number)[] = [post_id];

      let sql = `
        SELECT
          u.user_id,
          u.first_name,
          u.last_name,
          u.picture,
          l.created_at AS liked_at
        FROM
          likes l
        JOIN
          users u ON l.user_id = u.user_id
        WHERE
          l.post_id = $1
      `;

      if (cursor) {
        if (direction === 'next') {
          sql +=
            ' AND l.created_at < (SELECT created_at FROM likes WHERE post_id = $1 AND user_id = $2)';
        } else {
          sql +=
            ' AND l.created_at > (SELECT created_at FROM likes WHERE post_id = $1 AND user_id = $2)';
        }
        params.push(cursor);
      }

      sql += direction === 'next' ? ' ORDER BY l.created_at DESC' : ' ORDER BY l.created_at ASC';

      sql += ` LIMIT $${params.length + 1}`;

      params.push(limit);

      const result: QueryResult<TUsersLike> = await connection.query(sql, params);

      return { users: result.rows };
    } catch (error) {
      console.error('[LIKE MODEL] getLikesByPostId error', error);
      throw new Error(`Failed to get likes by post id: ${(error as Error).message}`, {
        cause: error,
      });
    } finally {
      connection.release();
    }
  }
}

export default LikeModel;
