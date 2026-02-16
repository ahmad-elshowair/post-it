import { QueryResult } from "pg";
import pool from "../database/pool";
import { IFeedPost } from "../interfaces/IPost";
import { Post } from "../types/post";

class PostModel {
  /**
   * CHECK EXISTING OF A POST.
   * @param id post id
   * @returns boolean
   */
  private async checkPostExist(id: string): Promise<boolean> {
    const connection = await pool.connect();
    try {
      const post: QueryResult<Post> = await connection.query(
        `SELECT * FROM posts WHERE post_id = $1`,
        [id],
      );
      if (post) {
        return true;
      }
      return false;
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * CREATE A POST
   * @param post post data
   * @returns post
   */
  async create(post: Post): Promise<Post> {
    const connection = await pool.connect();
    try {
      await connection.query("BEGIN");
      const sql =
        "INSERT INTO posts (user_id, description, image) VALUES($1, $2, $3) RETURNING *";
      const insertPost: QueryResult<Post> = await connection.query(sql, [
        post.user_id,
        post.description,
        post.image,
      ]);
      await connection.query("COMMIT");
      return insertPost.rows[0];
    } catch (error) {
      await connection.query("ROLLBACK");
      throw new Error(`create post model: ${(error as Error).message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * GET A POST BY ID
   * @param post_id post id
   * @returns post
   */
  async fetchPostById(post_id: string): Promise<Post> {
    const connection = await pool.connect();
    try {
      const post: QueryResult<Post> = await connection.query(
        "SELECT * FROM posts WHERE post_id = $1",
        [post_id],
      );
      if (post.rowCount === 0) {
        throw new Error("Post not found");
      }
      return post.rows[0];
    } catch (error) {
      throw new Error(`fetch post by id model: ${(error as Error).message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * GET ALL POSTS
   * @returns posts
   */
  async index(
    limit: number = 10,
    cursor?: string,
    direction: "next" | "previous" = "next",
  ): Promise<{ posts: Post[]; totalCount: number }> {
    const connection = await pool.connect();
    try {
      await connection.query("BEGIN");
      const params: any[] = [];
      let sql = `
		SELECT 
			p.post_id, p.description, p.updated_at, p.image, p.number_of_likes, p.number_of_comments, u.user_id, u.user_name, p.updated_at, u.picture, u.first_name, u.last_name
		FROM 
			posts p
		JOIN 
			users u 
		ON 
			p.user_id = u.user_id
	`;

      if (cursor) {
        if (direction === "next") {
          sql +=
            " AND p.updated_at < (SELECT updated_at FROM posts WHERE post_id = $1)";
        } else {
          sql +=
            " AND p.updated_at > (SELECT updated_at FROM posts WHERE post_id = $1)";
        }
        params.push(cursor);
      }

      sql +=
        direction === "next"
          ? " ORDER BY p.updated_at DESC"
          : " ORDER BY p.updated_at ASC";

      sql += ` LIMIT $${params.length + 1}`;

      params.push(limit);

      const result = await connection.query(sql, params);

      const posts =
        direction === "previous" ? result.rows.reverse() : result.rows;

      const resultCount = await connection.query(
        "SELECT COUNT(*) AS total FROM posts",
      );

      const totalCount = parseInt(resultCount.rows[0].total);
      await connection.query("COMMIT");
      return { posts, totalCount };
    } catch (error) {
      await connection.query("ROLLBACK");
      throw new Error(`index model: ${(error as Error).message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * UPDATE A POST
   * @param id post id
   * @param post post data
   * @returns post
   */
  async update(id: string, post: Post): Promise<Post> {
    const connection = await pool.connect();
    try {
      await connection.query("BEGIN");
      if (!this.checkPostExist) {
        throw new Error("Post not found");
      }
      const updatePost: QueryResult<Post> = await connection.query(
        "UPDATE posts SET description = $1, image = $2, updated_at = $3 WHERE post_id = $4 RETURNING *",
        [post.description, post.image, post.updated_at, id],
      );
      await connection.query("COMMIT");
      return updatePost.rows[0];
    } catch (error) {
      await connection.query("ROLLBACK");
      throw new Error(`update model: ${(error as Error).message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * DELETE A POST
   * @param id post id
   * @returns message
   */
  async delete(id: string): Promise<{ message: string }> {
    const connection = await pool.connect();
    try {
      await connection.query("BEGIN");
      if (!this.checkPostExist) {
        throw new Error("Post not found");
      }

      await connection.query("DELETE FROM posts WHERE post_id = $1", [id]);
      await connection.query("COMMIT");
      return { message: `POST: ${id} HAS BEEN DELETED !` };
    } catch (error) {
      await connection.query("ROLLBACK");
      throw new Error(`delete model: ${(error as Error).message}`);
    } finally {
      connection.release();
    }
  }
  /**
   * GET ALL POSTS BY USER ID
   * @param user_id user id
   * @param limit limit
   * @param cursor cursor
   * @param direction direction
   * @returns posts
   */
  async userPosts(
    user_id: string,
    limit: number = 10,
    cursor?: string,
    direction: "next" | "previous" = "next",
  ) {
    const connection = await pool.connect();
    try {
      await connection.query("BEGIN");
      const params: (string | number)[] = [user_id];

      let sql = `
        SELECT 
          p.post_id, p.description, p.updated_at, p.image, p.number_of_likes, p.number_of_comments, u.user_id, u.user_name, u.picture, u.first_name, u.last_name
        FROM
          posts AS p
        JOIN 
          users AS u	
        ON
          u.user_id= p.user_id
        WHERE 
          p.user_id = $1
	    `;

      if (cursor) {
        try {
          const postCheck = await connection.query(
            `SELECT updated_at FROM posts WHERE post_id = $1`,
            [cursor],
          );

          if (postCheck.rows.length > 0) {
            const timestamp = postCheck.rows[0].updated_at;
            if (direction === "next") {
              sql += ` AND p.updated_at < $2`;
            } else {
              sql += ` AND p.updated_at > $2`;
            }
            params.push(timestamp);
          } else {
            console.warn(`Post with ID ${cursor} not found for pagination`);
          }
        } catch (error) {
          console.error("Error checking post for cursor:", error);
        }
      }

      sql +=
        direction === "next"
          ? " ORDER BY p.updated_at DESC, p.post_id DESC "
          : " ORDER BY p.updated_at ASC, p.post_id ASC ";

      sql += ` LIMIT $${params.length + 1}`;

      params.push(limit);

      const result: QueryResult<IFeedPost> = await connection.query(
        sql,
        params,
      );

      const posts =
        direction === "previous" ? result.rows.reverse() : result.rows;

      const resultCount: QueryResult<{ total: string }> =
        await connection.query(
          `
			SELECT
				COUNT(*) AS total
			FROM
				posts p
			WHERE
				p.user_id = $1
			`,
          [user_id],
        );

      const totalCount = parseInt(resultCount.rows[0].total);
      await connection.query("COMMIT");
      return { posts, totalCount };
    } catch (error) {
      await connection.query("ROLLBACK");
      throw new Error(`userPosts model: ${(error as Error).message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * GET ALL POSTS OF A USER AND HIS FOLLOWINGS
   * @param user_id user id
   * @param limit limit
   * @param cursor cursor
   * @param direction direction
   * @returns posts
   */
  async feed(
    user_id: string,
    limit: number = 10,
    cursor?: string,
    direction: "next" | "previous" = "next",
  ): Promise<{ posts: IFeedPost[]; totalCount: number }> {
    const connection = await pool.connect();
    try {
      await connection.query("BEGIN");
      let params: (string | number)[] = [user_id];
      let sql = `
				SELECT 
					p.post_id, p.description, p.updated_at, p.image, p.number_of_likes, p.number_of_comments, u.user_id, u.user_name, u.picture, u.first_name, u.last_name
				FROM 
					posts p
				JOIN 
					users u 
				ON 
					p.user_id = u.user_id
				WHERE 
					u.user_id = $1
   			OR 
					u.user_id 
				IN (
					SELECT 
						user_id_followed
					FROM 
						follows
					WHERE 
						user_id_following = $1
					)
			`;
      if (cursor) {
        try {
          const postCheck = await connection.query(
            `SELECT updated_at FROM posts WHERE post_id = $1`,
            [cursor],
          );

          if (postCheck.rows.length > 0) {
            const timestamp = postCheck.rows[0].updated_at;
            if (direction === "next") {
              sql += ` AND p.updated_at < $2`;
            } else {
              sql += ` AND p.updated_at > $2`;
            }
            params.push(timestamp);
          } else {
            console.warn(`Post with ID ${cursor} not found for pagination`);
          }
        } catch (error) {
          console.error("Error checking post for cursor:", error);
        }
      }

      sql +=
        direction === "next"
          ? " ORDER BY p.updated_at DESC, p.post_id DESC "
          : " ORDER BY p.updated_at ASC, p.post_id ASC ";

      sql += ` LIMIT $${params.length + 1}`;

      params.push(limit);

      const result = await connection.query(sql, params);

      const posts =
        direction === "previous" ? result.rows.reverse() : result.rows;

      const resultCount = await connection.query(
        `
			SELECT
				COUNT(*) AS total
			FROM
				posts p
			WHERE
				p.user_id = $1
			OR
				p.user_id IN (SELECT user_id_followed FROM follows WHERE user_id_following = $1)
		`,
        [user_id],
      );

      const totalCount = resultCount.rows[0].total;
      await connection.query("COMMIT");
      return { posts, totalCount };
    } catch (error) {
      await connection.query("ROLLBACK");
      throw new Error(`feed model: ${(error as Error).message}`);
    } finally {
      connection.release();
    }
  }
}

export default PostModel;
