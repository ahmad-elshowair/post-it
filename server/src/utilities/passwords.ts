import bcrypt from "bcryptjs";
import config from "../configs/config.js";

const checkPassword = (userPassword: string, dbPassword: string) => {
  return bcrypt.compareSync(userPassword + config.pepper, dbPassword);
};

const hashPassword = (password: string) => {
  return bcrypt.hashSync(password + config.pepper, config.salt);
};

export default {
  checkPassword,
  hashPassword,
};
