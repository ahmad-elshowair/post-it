import { PoolClient, QueryResult } from "pg";
import pool from "../database/pool.js";
import { TFriend, TUnknownUser, TUser } from "../types/users.js";
import { buildUpdateQuery } from "../utilities/build-update-query.js";

class UserModel {
  /**
   * Get all users.
   * @returns {Promise<TUser[]>}
   */
  async index(): Promise<TUser[]> {
    const connection = await pool.connect();
    try {
      const sql = "SELECT * FROM users";
      const result: QueryResult<TUser> = await connection.query(sql);
      if (result.rowCount === 0) {
        return [];
      }
      return result.rows;
    } catch (error) {
      console.error("[USER MODEL] error getting all users", error);
      throw new Error(`Failed to get users: ${(error as Error).message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * GET ALL USERS WITH PAGINATION
   * @param limit limit
   * @param cursor cursor
   * @param direction direction
   * @returns {Promise<{ users: TUser[]; totalCount: number }>}
   */
  async indexWithPagination(
    limit: number = 10,
    cursor: string,
    direction: "next" | "previous" = "next",
  ): Promise<{ users: TUser[]; totalCount: number }> {
    const connection = await pool.connect();
    try {
      const params: any[] = [];

      let sql = "SELECT * FROM users";

      if (cursor) {
        if (direction === "next") {
          sql += " WHERE user_id > $1";
        } else {
          sql += " WHERE user_id < $1";
        }
        params.push(cursor);
      }

      sql +=
        direction === "next"
          ? " ORDER BY user_id ASC"
          : " ORDER BY user_id DESC";

      sql += ` LIMIT $${params.length + 1}`;

      params.push(limit);
      const result: QueryResult<TUser> = await connection.query(sql, params);

      const users =
        direction === "previous" ? result.rows.reverse() : result.rows;
      const countResult = await connection.query(
        "SELECT COUNT(*) AS total FROM users",
      );

      const totalCount = parseInt(countResult.rows[0].total);

      return { users, totalCount };
    } catch (error) {
      console.error("[USER MODEL] indexWithPagination error", error);

      throw new Error(
        `Failed to get pagination users: ${(error as Error).message}`,
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Get user by id.
   * @param {string} user_id - The id of the user.
   * @returns {Promise<TUser>}
   * @throws {Error} If the user is not found.
   */
  async getUserById(user_id: string): Promise<TUser> {
    const connection = await pool.connect();
    try {
      const sql = "SELECT * FROM users WHERE user_id = ($1)";
      const result: QueryResult<TUser> = await connection.query(sql, [user_id]);

      if (result.rowCount === 0) {
        throw new Error("User not found");
      }

      return result.rows[0];
    } catch (error) {
      console.error("[USER MODEL] getUserById error", error);
      throw new Error(`Failed to get user by ID: ${(error as Error).message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * Get user by user name.
   * @param {string} user_name - The user name of the user.
   * @returns {Promise<TUser>}
   * @throws {Error} If the user is not found.
   */
  async getUserByUsername(user_name: string): Promise<TUser> {
    const connection = await pool.connect();
    try {
      const sql = `SELECT * FROM users WHERE user_name = $1`;
      const result: QueryResult<TUser> = await connection.query(sql, [
        user_name,
      ]);

      if (result.rowCount === 0) {
        throw new Error("User not found");
      }

      return result.rows[0];
    } catch (error) {
      console.error("[USER MODEL] getUserByUsername error", error);
      throw new Error(
        `Failed to get user by user name: ${(error as Error).message}`,
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Update user.
   * @param {string} user _id - The id of the user.
   * @param {TUser} user - The user to update.
   * @returns {Promise<TUser>}
   * @throws {Error} If the user is not found.
   */
  async update(user_id: string, user: TUser): Promise<TUser> {
    // connect to the database
    const connection = await pool.connect();
    try {
      await connection.query("BEGIN");

      const existUser = await this.getUserById(user_id);
      if (!existUser) {
        throw new Error("THIS USER IS NOT EXIST !");
      }

      // Build the dynamic update query.
      const [updateUserQuery, values] = buildUpdateQuery(user_id, user);
      const UpdateUser: QueryResult<TUser> = await connection.query(
        updateUserQuery,
        values,
      );

      await connection.query("COMMIT");

      return UpdateUser.rows[0];
    } catch (error) {
      await connection.query("ROLLBACK");
      console.error("[USER MODEL] update error", error);
      throw new Error(`Failed to update user: ${(error as Error).message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * Delete user.
   * @param {string} user_id - The id of the user.
   * @returns {Promise<{ message: string }>}
   * @throws {Error} If the user is not found.
   */
  async delete(user_id: string): Promise<{ message: string }> {
    // connect to the database
    const connection = await pool.connect();
    try {
      await connection.query("BEGIN");

      const existUser = await this.getUserById(user_id);

      if (!existUser) {
        throw new Error("User not found");
      }

      const sql = "DELETE FROM users WHERE user_id = ($1) RETURNING *";

      await connection.query(sql, [user_id]);

      await connection.query("COMMIT");
      return { message: "User deleted successfully" };
    } catch (error) {
      await connection.query("ROLLBACK");
      console.error("[USER MODEL] delete error", error);
      throw new Error(`Failed to delete user: ${(error as Error).message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * Get unknown users.
   * @param {string} user_id
   * @returns {Promise<TUnknownUser[]>}
   * @throws {Error} If the user is not found.
   */
  async getUnknowns(user_id: string): Promise<TUnknownUser[]> {
    // connect to the database
    const connection = await pool.connect();
    try {
      const sql = `SELECT
										u.user_id,
										u.first_name,
										u.last_name,
										u.picture,
                    u.user_name
									FROM users u
									LEFT JOIN follows f ON u.user_id = f.user_id_followed
									AND f.user_id_following = ($1)
									WHERE u.user_id != ($1)
									AND f.user_id_followed IS NULL`;
      const result: QueryResult<TUnknownUser> = await connection.query(sql, [
        user_id,
      ]);

      return result.rows;
    } catch (error) {
      console.error("[USER MODEL] getUnknowns error", error);
      throw new Error(
        `Failed to get unknown users ${(error as Error).message}`,
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Update user online status.
   * @param {string} user_id
   * @param {boolean} is_online
   * @returns {Promise<TUser>}
   * @throws {Error} If the user is not found.
   */
  async updateOnlineStatus(
    user_id: string,
    is_online: boolean,
  ): Promise<TUser> {
    const connection: PoolClient = await pool.connect();
    try {
      await connection.query("BEGIN");

      const existUser = await this.getUserById(user_id);
      if (!existUser) {
        throw new Error("User not found");
      }
      const sql = `
		    UPDATE users
		      SET is_online = ($1),
		        updated_at = NOW()
		    WHERE user_id = ($2)
		    RETURNING *`;

      const result: QueryResult<TUser> = await connection.query(sql, [
        is_online,
        user_id,
      ]);

      await connection.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      await connection.query("ROLLBACK");
      console.error("[USER MODEL] update online status error", error);
      throw new Error(
        `Failed to update online status due to ${(error as Error).message}`,
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Get friends (mutual follows) for a user.
   * @param {string} user_id
   * @param {boolean} is_online
   * @param {number} limit
   * @param {string} cursor
   * @param {"next" | "previous"} direction
   * @returns {Promise<{ users: TFriend[]; totalCount: number }>}
   * @throws {Error} If the user is not found.
   */
  async getFriends(
    user_id: string,
    is_online: boolean = false,
    limit: number = 10,
    cursor?: string,
    direction: "next" | "previous" = "next",
  ): Promise<{ users: TFriend[]; totalCount: number }> {
    const connection: PoolClient = await pool.connect();
    try {
      const params: any[] = [user_id];

      let sql = `SELECT
								u.user_id,
								u.first_name,
								u.last_name,
								u.user_name,
								u.picture,
								u.bio,
								u.marital_status,
								u.number_of_followers,
								u.number_of_followings,
                u.is_online
							FROM
								users u
								JOIN follows f1 ON u.user_id = f1.user_id_followed
								JOIN follows f2 ON f1.user_id_following = f2.user_id_followed
							WHERE
								f1.user_id_following = $1
								AND f2.user_id_following = u.user_id
								AND u.user_id != $1`;

      if (is_online) {
        sql += ` AND u.is_online = true`;
      }

      if (cursor) {
        if (direction === "next") {
          sql += " AND u.user_id > $2";
        } else {
          sql += " AND u.user_id < $2";
        }
        params.push(cursor);
      }

      sql += ` ORDER BY u.is_online DESC, u.updated_at DESC`;
      sql += ` LIMIT $${params.length + 1}`;
      params.push(limit);

      const result: QueryResult<TFriend> = await connection.query(sql, params);

      // Use a proper COUNT(*) query for accurate total count
      let countSql = `SELECT COUNT(*) AS total
				FROM users u
				JOIN follows f1 ON u.user_id = f1.user_id_followed
				JOIN follows f2 ON f1.user_id_following = f2.user_id_followed
				WHERE f1.user_id_following = $1
				AND f2.user_id_following = u.user_id
				AND u.user_id != $1`;

      if (is_online) {
        countSql += ` AND u.is_online = true`;
      }

      const countResult = await connection.query(countSql, [user_id]);
      const totalCount = parseInt(countResult.rows[0].total);

      return { users: result.rows, totalCount };
    } catch (error) {
      console.error("[USER MODEL] get friends error", error);
      throw new Error(`Failed to get friends ${(error as Error).message}`);
    } finally {
      connection.release();
    }
  }
}

export default UserModel;
