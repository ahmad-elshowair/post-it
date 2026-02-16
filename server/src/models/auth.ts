import { QueryResult } from "pg";
import { user_model } from "../controllers/factory";
import db from "../database/pool";
import { TRegisterCredentials, TUser } from "../types/users";
import passwords from "../utilities/passwords";

class AuthModel {
  async register(registerCredentials: TRegisterCredentials): Promise<TUser> {
    const connection = await db.connect();
    try {
      await connection.query("BEGIN");

      const hashedPassword = passwords.hashPassword(
        registerCredentials.password,
      );
      const sql = `
          INSERT INTO users (
            first_name,
            last_name,
            user_name,
            email,
            password,
            is_online
          ) 
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *`;
      const values = [
        registerCredentials.first_name,
        registerCredentials.last_name,
        registerCredentials.user_name,
        registerCredentials.email,
        hashedPassword,
        true,
      ];

      const result: QueryResult<TUser> = await connection.query(sql, values);

      await connection.query("COMMIT");

      return result.rows[0];
    } catch (error) {
      await connection.query("ROLLBACK");
      console.error(`[AUTH MODEL] register error: ${(error as Error).message}`);

      throw new Error(`failed to register user: ${(error as Error).message}`);
    } finally {
      connection.release();
    }
  }

  async login(email: string, password: string): Promise<TUser> {
    const connection = await db.connect();
    try {
      const result = await connection.query<TUser>(
        "SELECT * FROM users WHERE email=$1",
        [email],
      );
      const user = result.rows[0];
      if (!user) {
        throw new Error(`user not found !`);
      }

      // Verify the password
      const isPasswordValid = passwords.checkPassword(password, user.password);
      if (!isPasswordValid) {
        throw new Error("Invalid credentials!");
      }

      if (user.is_online === false) {
        await connection.query("BEGIN");
        await user_model.updateOnlineStatus(user.user_id as string, true);
        const updatedUserResult = await connection.query<TUser>(
          "SELECT * FROM users WHERE user_id=$1",
          [user.user_id],
        );

        await connection.query("COMMIT");
        return updatedUserResult.rows[0];
      }
      return user;
    } catch (error) {
      await connection.query("ROLLBACK");
      console.error(`[AUTH MODEL] login error: ${(error as Error).message}`);
      throw new Error(`failed to login user: ${(error as Error).message}`);
    } finally {
      connection.release();
    }
  }
}

export default AuthModel;
