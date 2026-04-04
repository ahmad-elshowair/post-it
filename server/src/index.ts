import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import config from "./configs/config.js";
import errorMiddleware from "./middlewares/error.js";
import routes from "./routes/index.js";
import { scheduledTokenCleanup } from "./utilities/scheduledTasks.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// create an instance of app
const app: Application = express();

// create port variable that is assigned from the config file
const port: number = config.port;

app.use(
  "/api/images",
  express.static(path.join(__dirname, "../public/images"))
);

// use the middleware of express.json and helmet and morgan
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(morgan("dev"));
app.use(cookieParser());

const allowedOrigins =
  config.node_env === "development"
    ? ["http://localhost:3000", config.client_url_dev]
    : [config.client_url_prod];

// use the cors
app.use(
  cors({
    origin: function (origin, callback) {
      // IN development MODE, ACCEPT REQUESTS FROM ANT ORIGIN.
      if (config.node_env === "development") {
        callback(null, true);
      } else if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn("Block by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-CSRF-Token",
      "X-Fingerprint",
      "csrf-token",
      "CSRF-Token",
      "Origin",
      "Accept",
    ],
    exposedHeaders: ["X-CSRF-Token"],
  })
);

// create a get request of home endpoint
app.get("/", (_req: Request, res: Response) => {
  res.send("Hello World!");
});

// use all routes
app.use("/api", routes);

// use middleware of error
app.use(errorMiddleware);

app.use((_req: Request, res: Response) => {
  res.status(404).json("YOU HAVE GOT LOST !");
});

// Start the scheduled token cleanup
scheduledTokenCleanup();

// add listen to the app
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
