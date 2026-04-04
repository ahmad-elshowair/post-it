import { PoolClient, QueryResult } from "pg";
import db from "../database/pool.js";
import { TFollowers, TFollowings } from "../types/follow.js";

export default class FollowModel {
  /**
   * Check if a user is following another user.
   * @param {string} following_id
   * @param {string} followed_id
   * @returns {Promise<{ is_following: boolean }>}
   * @throws {Error} Error if required fields are missing or operation fails
   */
  async isFollowing(
    following_id: string,
    followed_id: string,
  ): Promise<{ is_following: boolean }> {
    if (!following_id || !followed_id) {
      throw new Error(
        "Missing required fields: following_id and followed_id are required",
      );
    }
    const connection: PoolClient = await db.connect();
    try {
      const sql = `
        SELECT EXISTS(
          SELECT 1
          FROM follows
          WHERE user_id_following = $1 AND user_id_followed = $2
        ) AS is_following;
      `;
      const result: QueryResult<{ is_following: boolean }> =
        await connection.query(sql, [following_id, followed_id]);

      return result.rows[0];
    } catch (error) {
      console.error("[FOLLOW MODEL] isFollowing error", error);
      throw new Error(
        `Failed to check follow model error: ${(error as Error).message}`,
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Follow a user.
   * @param {string} user_id_following
   * @param {string} user_id_followed
   * @returns {Promise<{ message: string }>}
   * @throws {Error} Error if required fields are missing or operation fails
   */
  async follow(
    user_id_following: string,
    user_id_followed: string,
  ): Promise<{ message: string }> {
    if (!user_id_following || !user_id_followed) {
      throw new Error(
        "Missing required fields: user_id_following and user_id_followed are required",
      );
    }
    const connection: PoolClient = await db.connect();
    try {
      await connection.query("BEGIN");

      const isFollowing = await this.isFollowing(
        user_id_following,
        user_id_followed,
      );
      if (!isFollowing.is_following) {
        // FOLLOW THE USER.
        await connection.query(
          `INSERT INTO follows (user_id_following, user_id_followed) VALUES ($1, $2)`,
          [user_id_following, user_id_followed],
        );

        // INCREMENT THE "number_of_followings" FOR THE FOLLOWING USER.
        await connection.query(
          "UPDATE users SET number_of_followings = number_of_followings + 1 WHERE user_id = $1",
          [user_id_following],
        );

        // INCREMENT THE "number_of_followers" FOR THE FOLLOWED USER.
        await connection.query(
          "UPDATE users SET number_of_followers = number_of_followers + 1 WHERE user_id = $1",
          [user_id_followed],
        );

        await connection.query("COMMIT");

        return { message: `Followed successfully!` };
      } else {
        await connection.query("ROLLBACK");
        return { message: `Already Following this User!` };
      }
    } catch (error) {
      await connection.query("ROLLBACK");
      console.error("[FOLLOW MODEL] follow error", error);
      throw new Error(`Failed to follow user: ${(error as Error).message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * Unfollow a user.
   * @param {string} user_id_following
   * @param {string} user_id_followed
   * @returns {Promise<{ message: string }>}
   * @throws {Error} Error if required fields are missing or operation fails
   */
  async unFollow(
    user_id_following: string,
    user_id_followed: string,
  ): Promise<{ message: string }> {
    if (!user_id_following || !user_id_followed) {
      throw new Error(
        "Missing required fields: user_id_following and user_id_followed are required",
      );
    }
    const connection: PoolClient = await db.connect();
    try {
      await connection.query("BEGIN");

      const isFollowing = await this.isFollowing(
        user_id_following,
        user_id_followed,
      );
      if (isFollowing.is_following) {
        await connection.query(
          "DELETE FROM follows WHERE user_id_following = $1 AND user_id_followed = $2",
          [user_id_following, user_id_followed],
        );

        // DECREMENT THE "number_of_followings" FOR THE FOLLOWING USER.
        await connection.query(
          "UPDATE users SET number_of_followings = number_of_followings - 1 WHERE user_id= ($1) AND number_of_followings > 0",
          [user_id_following],
        );

        // DECREMENT THE "number_of_followers" FOR THE FOLLOWED USER.
        await connection.query(
          "UPDATE users SET number_of_followers = number_of_followers - 1 WHERE user_id = ($1) AND number_of_followers > 0",
          [user_id_followed],
        );

        await connection.query("COMMIT");

        return { message: `Unfollowed successfully!` };
      } else {
        await connection.query("ROLLBACK");
        return { message: `Not currently following this user!` };
      }
    } catch (error) {
      await connection.query("ROLLBACK");
      console.error("[FOLLOW MODEL] unFollow error", error);
      throw new Error(`Failed to unfollow user: ${(error as Error).message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * Get the number of users a user is following.
   * @param {string} user_id .
   * @returns {Promise<number>}
   * @throws {Error} Error if required fields are missing or operation fails
   */
  async getNumberOfFollowings(user_id: string): Promise<number> {
    if (!user_id) {
      throw new Error("Missing required fields: user_id is required");
    }
    const connection: PoolClient = await db.connect();
    try {
      const sql = `
          SELECT
            COUNT(DISTINCT user_id_followed) AS "followings"
          FROM
            follows
          WHERE
            user_id_following = $1;
      `;

      const result = await connection.query(sql, [user_id]);

      return parseInt(result.rows[0].followings);
    } catch (error) {
      console.error("[FOLLOW MODEL] getNumberOfFollowings error", error);
      throw new Error(
        `Failed to get number of followings: ${(error as Error).message}`,
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Get the number of followers for a user.
   * @param {string} user_id .
   * @returns {Promise<number>}
   * @throws {Error} Error if required fields are missing or operation fails
   */
  async getNumberOfFollowers(user_id: string): Promise<number> {
    if (!user_id) {
      throw new Error("Missing required fields: user_id is required");
    }
    const connection: PoolClient = await db.connect();
    try {
      const sql = `
          SELECT
            COUNT(DISTINCT f.user_id_following) AS "followers"
          FROM
            follows AS f
          WHERE
            f.user_id_followed = $1
        `;
      const result = await connection.query(sql, [user_id]);

      return parseInt(result.rows[0].followers);
    } catch (error) {
      console.error("[FOLLOW MODEL] getNumberOfFollowers error", error);
      throw new Error(
        `Failed to get number of followers: ${(error as Error).message}`,
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Get users that a user is following.
   * @param {string} user_id .
   * @returns {Promise<TFollowings[]>}
   * @throws {Error} Error if required fields are missing or operation fails
   */
  async getFollowings(
    user_id: string,
    limit: number = 10,
    cursor?: string,
    direction: "next" | "previous" = "next",
  ): Promise<{ followings: TFollowings[] }> {
    if (!user_id) {
      throw new Error("Missing required fields: user_id is required");
    }

    const connection: PoolClient = await db.connect();
    try {
      await connection.query("BEGIN");
      const params: (string | number)[] = [user_id];

      let sql = `
      SELECT
        u.user_id,
        u.user_name,
        u.first_name,
        u.last_name,
        u.picture,
        u.cover,
        u.bio,
        u.number_of_followers,
        u.number_of_followings
			FROM
			users u
			JOIN follows f ON u.user_id = f.user_id_followed
			WHERE f.user_id_following = $1`;

      if (cursor) {
        if (direction === "next") {
          sql += ` AND f.created_at < (SELECT created_at FROM follows WHERE user_id_following = $1 AND user_id_followed = $2)`;
        } else {
          sql += ` AND f.created_at > (SELECT created_at FROM follows WHERE user_id_following = $1 AND user_id_followed = $2)`;
        }
        params.push(cursor);
      }
      sql +=
        direction === "next"
          ? " ORDER BY f.created_at DESC"
          : " ORDER BY f.created_at ASC";
      sql += ` LIMIT $${params.length + 1}`;

      params.push(limit);

      const result: QueryResult<TFollowings> = await connection.query(
        sql,
        params,
      );

      const followings = result.rows;
      // COMMIT TRANSACTION.
      await connection.query("COMMIT");
      return { followings };
    } catch (error) {
      await connection.query("ROLLBACK");
      console.error("[FOLLOW MODEL] getFollowings error", error);
      throw new Error(`Failed to get followings: ${(error as Error).message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * Get users that follow a user.
   * @param {string} user_id .
   * @param {number} limit .
   * @param {string} cursor .
   * @param {"next" | "previous"} direction .
   * @returns {Promise<{ followers: TFollowers[] }>}
   * @throws {Error} Error if required fields are missing or operation fails
   */
  async getFollowers(
    user_id: string,
    limit: number = 10,
    cursor?: string,
    direction: "next" | "previous" = "next",
  ): Promise<{ followers: TFollowers[] }> {
    if (!user_id) {
      throw new Error("Missing required fields: user_id is required");
    }
    const connection: PoolClient = await db.connect();
    try {
      await connection.query("BEGIN");
      const params: (string | number)[] = [user_id];

      let sql = `
        SELECT
          u.user_id,
          u.user_name,
          u.first_name,
          u.last_name,
          u.picture,
          u.cover,
          u.bio,
          u.number_of_followers,
          u.number_of_followings,
          f.created_at 
        FROM
          users u
        JOIN follows f ON u.user_id = f.user_id_following
			WHERE f.user_id_followed = ($1)`;

      if (cursor) {
        if (direction === "next") {
          sql += ` AND f.created_at < (SELECT created_at FROM follows WHERE user_id_followed = $1 AND user_id_following = $2)`;
        } else {
          sql += ` AND f.created_at > (SELECT created_at FROM follows WHERE user_id_followed = $1 AND user_id_following = $2)`;
        }
        params.push(cursor);
      }
      sql +=
        direction === "next"
          ? " ORDER BY f.created_at DESC"
          : " ORDER BY f.created_at ASC";
      sql += ` LIMIT $${params.length + 1}`;

      params.push(limit);

      const result: QueryResult<TFollowers> = await connection.query(
        sql,
        params,
      );
      const followers = result.rows;

      await connection.query("COMMIT");
      return { followers };
    } catch (error) {
      await connection.query("ROLLBACK");
      console.error("[FOLLOW MODEL] getFollowers error", error);
      throw new Error(`Failed to get followers: ${(error as Error).message}`);
    } finally {
      connection.release();
    }
  }
}
