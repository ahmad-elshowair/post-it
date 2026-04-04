import { ValidationChain, check } from "express-validator";
import { QueryResult } from "pg";
import { user_model } from "../../controllers/factory.js";
import db from "../../database/pool.js";
import passwords from "../../utilities/passwords.js";

// A helper function to check the length
export const checkLength = (
  field: string,
  min: number,
  message: string
): ValidationChain => check(field).isLength({ min }).withMessage(message);

// CHECK IF THE USER NAME LENGTH IS AT LEAST 3 CHARACTERS.
const checkUserNameLength: ValidationChain = checkLength(
  "user_name",
  6,
  "USERNAME MUST BE AT LEAST 6 CHARACTERS LONG !"
)
  .trim()
  .escape();

// CHECK IF THE FIRST NAME LENGTH IS AT LEAST 3 CHARACTER
const checkFirstNameLength: ValidationChain = checkLength(
  "first_name",
  3,
  "THE FIRST NAME MUST BE AT LEAST 3 CHARACTERS!"
)
  .trim()
  .escape();

// CHECK IF THE FIRST NAME LENGTH IS AT LEAST 3 CHARACTER
const checkLastNameLength: ValidationChain = checkLength(
  "last_name",
  3,
  "THE LAST NAME MUST BE AT LEAST 3 CHARACTERS!"
)
  .trim()
  .escape();

const checkPasswordLength: ValidationChain = checkLength(
  "password",
  6,
  "PASSWORD MUST BE AT LEAST 6 CHARACTERS LONG !"
);

const checkIsEmail: ValidationChain = check("email")
  .isEmail()
  .withMessage("Invalid email format! Example: 'example@domain-name.com'")
  .normalizeEmail();

// CHECK IF THE PASSWORD IS CORRECT.
const checkPassword: ValidationChain = check("password").custom(
  async (password: string, { req }) => {
    const connection = await db.connect();
    try {
      await connection.query("BEGIN");
      const result: QueryResult<{ password: string }> = await connection.query(
        "SELECT password FROM users WHERE email = $1",
        [req.body.email]
      );
      const user = result.rows[0];

      if (user && !passwords.checkPassword(password, user.password)) {
        throw new Error("INCORRECT PASSWORD !");
      }
      await connection.query("COMMIT");
    } catch (error) {
      await connection.query("ROLLBACK");
      if (
        error instanceof Error &&
        error.message !== " EMAIL DOES NOT EXIST !"
      ) {
        throw new Error(`Check Password: ${(error as Error).message}!`);
      }
    } finally {
      connection.release();
    }
  }
);

// Check if the use name exists in the database
const checkUserNameExists: ValidationChain = check("user_name").custom(
  async (user_name: string) => {
    try {
      const user = await user_model.getUserByUsername(user_name);
      if (user) {
        throw new Error("USERNAME ALREADY EXISTS!");
      }
    } catch (error) {
      if (error instanceof Error && !error.message.includes("User not found")) {
        throw new Error(`${(error as Error).message}!`);
      }
    }
  }
);

//CHECK IF THE EMAIL EXISTS IN THE DATABASE.
const isEmailExist = (context: "register" | "login"): ValidationChain =>
  check("email").custom(async (email: string, { req }) => {
    // connect to the database
    const connection = await db.connect();
    try {
      await connection.query("BEGIN");
      const result: QueryResult<{ email: string }> = await connection.query(
        "SELECT email FROM users WHERE email=$1",
        [email]
      );
      const user = result.rows[0];

      if (context === "login" && !user) {
        throw new Error(`EMAIL DOES NOT EXIST !`);
      }

      if (context === "register" && user) {
        throw new Error(`EMAIL ALREADY EXISTS !`);
      }

      req.user = user;
      await connection.query("COMMIT");
    } catch (error) {
      await connection.query("ROLLBACK");
      throw new Error(`${(error as Error).message}`);
    } finally {
      connection.release();
    }
  });
export const registerValidation = [
  checkIsEmail,
  checkPasswordLength,
  checkUserNameLength,
  checkFirstNameLength,
  checkLastNameLength,
  isEmailExist("register"),
  checkUserNameExists,
];
export const loginValidation = [
  checkIsEmail,
  checkPasswordLength,
  isEmailExist("login"),
  checkPassword,
];
