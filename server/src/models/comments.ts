import { QueryResult } from "pg";
import pool from "../database/pool";
import { IComment } from "../types/comments";

class CommentModel {
  async create(comment: IComment): Promise<IComment> {
    const connection = await pool.connect();
    try {
      await connection.query("BEGIN");
      const sql = `
            INSERT INTO comments (post_id, user_id, content, parent_comment_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

      const insertComment = await connection.query(sql, [
        comment.post_id,
        comment.user_id,
        comment.content,
        comment.parent_comment_id,
      ]);

      // UPDATE POST COMMENT COUNT.
      await connection.query(
        `UPDATE posts SET number_of_comments = number_of_comments + 1 WHERE post_id = $1`,
        [comment.post_id],
      );

      await connection.query("COMMIT");
      return insertComment.rows[0];
    } catch (error) {
      await connection.query("ROLLBACK");
      console.error(error);
      throw new Error(
        `create comment model error: ${(error as Error).message}`,
      );
    } finally {
      connection.release();
    }
  }

  async update(
    comment_id: string,
    content: string,
    user_id: string,
  ): Promise<IComment> {
    const connection = await pool.connect();
    try {
      await connection.query("BEGIN");
      const sql = `
            UPDATE comments
            SET content = $2, updated_at = CURRENT_TIMESTAMP
            WHERE comment_id = $1
            RETURNING *
        `;

      const commentExist = await connection.query(
        `SELECT * FROM comments WHERE comment_id = $1 AND user_id = $2`,
        [comment_id, user_id],
      );
      if (commentExist.rowCount === 0) {
        throw new Error("Comment not found or does not belong to the user");
      }
      const updateComment = await connection.query(sql, [comment_id, content]);

      await connection.query("COMMIT");
      return updateComment.rows[0];
    } catch (error) {
      await connection.query("ROLLBACK");
      console.error(error);
      throw new Error(
        `update comment model error: ${(error as Error).message}`,
      );
    } finally {
      connection.release();
    }
  }

  async delete(
    comment_id: string,
    user_id: string,
  ): Promise<{ message: string }> {
    const connection = await pool.connect();
    try {
      await connection.query("BEGIN");

      // CHECK IF THE COMMENT EXISTS OR BELONGS TO THE USER.
      const checkCommentExist = await connection.query(
        `SELECT * FROM comments WHERE comment_id = $1 AND user_id = $2`,
        [comment_id, user_id],
      );
      if (checkCommentExist.rowCount === 0) {
        throw new Error("Comment not found or does not belong to the user");
      }

      const post_id = checkCommentExist.rows[0].post_id;
      const sql = `
            DELETE FROM comments
            WHERE comment_id = $1 AND user_id = $2
        `;

      await connection.query(sql, [comment_id, user_id]);

      // UPDATE POST COMMENT COUNT.
      await connection.query(
        `UPDATE posts SET number_of_comments = GREATEST(number_of_comments - 1, 0) WHERE post_id = $1`,
        [post_id],
      );
      await connection.query("COMMIT");
      return { message: "Comment deleted successfully" };
    } catch (error) {
      await connection.query("ROLLBACK");
      console.error(error);
      throw new Error(
        `delete comment model error: ${(error as Error).message}`,
      );
    } finally {
      connection.release();
    }
  }

  async getCommentsByPostId(post_id: string): Promise<IComment[]> {
    const connection = await pool.connect();
    try {
      const sql = `
            SELECT 
                c.comment_id,
                c.post_id,
                c.user_id,
                c.content,
                c.created_at,
                c.updated_at,
                c.parent_comment_id,
                u.picture,
                u.first_name,
                u.last_name,
                u.user_name
            FROM 
                comments AS c
            JOIN 
                users AS u ON c.user_id = u.user_id
            WHERE 
                c.post_id = $1
            ORDER BY 
                c.created_at ASC
        `;

      const comments: QueryResult<IComment> = await connection.query(sql, [
        post_id,
      ]);

      return comments.rows;
    } catch (error) {
      console.error(error);
      throw new Error(
        `get comments by post id model error: ${(error as Error).message}`,
      );
    } finally {
      connection.release();
    }
  }

  async getRepliesByCommentId(comment_id: string): Promise<IComment[]> {
    const connection = await pool.connect();
    try {
      const sql = `
            SELECT 
                c.comment_id,
                c.post_id,
                c.user_id,
                c.content,
                c.created_at,
                c.updated_at,
                c.parent_comment_id,
                u.picture,
                u.first_name,
                u.last_name,
                u.user_name
            FROM 
                comments AS c
            JOIN 
                users AS u ON c.user_id = u.user_id
            WHERE 
                c.parent_comment_id = $1
            ORDER BY 
                c.created_at ASC
        `;

      const replies: QueryResult<IComment> = await connection.query(sql, [
        comment_id,
      ]);

      return replies.rows;
    } catch (error) {
      console.error(error);
      throw new Error(
        `get replies by comment id model error: ${(error as Error).message}`,
      );
    } finally {
      connection.release();
    }
  }
}

export default CommentModel;
