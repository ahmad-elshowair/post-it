import { Pool } from "pg";
import config from "../configs/config.js";

// connect the database of postgresql
const pool = new Pool({
	user: config.pg_user,
	password: config.pg_password,
	host: config.pg_host,
	port: config.pg_port,
	database: config.pg_database,
});

// add listener when there is error with the connection
pool.on("error", (error: Error) => {
	console.log("Unexpected error on idle client", error.message);
	process.exit(-1);
});

// export the pool
export default pool;
