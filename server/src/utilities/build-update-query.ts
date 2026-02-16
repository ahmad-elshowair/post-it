import { TUser } from "../types/users";
import passwords from "./passwords";

/**
 * Allowed fields that can be updated via the user update endpoint.
 * This prevents mass-assignment attacks where a malicious user
 * could inject fields like `is_online`, `number_of_followers`, etc.
 */
const ALLOWED_UPDATE_FIELDS: Set<string> = new Set([
  "first_name",
  "last_name",
  "user_name",
  "password",
  "picture",
  "cover",
  "bio",
  "marital_status",
  "city",
  "hometown",
]);

export const buildUpdateQuery = (
  id: string,
  updates: Partial<TUser>,
): [string, (string | boolean | Date)[]] => {
  const fields: string[] = [];
  const values: (string | boolean | Date)[] = [];
  let index = 1;

  for (const [key, value] of Object.entries(updates)) {
    // Skip fields that are not in the allowlist
    if (!ALLOWED_UPDATE_FIELDS.has(key)) {
      continue;
    }

    if (key === "password") {
      fields.push(`${key} = $${index}`);
      values.push(passwords.hashPassword(value as string));
    } else {
      fields.push(`${key} = $${index}`);
      values.push(value as string | boolean | Date);
    }
    index++;
  }

  if (fields.length === 0) {
    throw new Error("No valid fields to update");
  }

  values.push(id);
  const query = `UPDATE users SET ${fields.join(
    ", ",
  )} WHERE user_id = $${index} RETURNING *`;
  return [query, values];
};
