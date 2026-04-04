import { NextFunction, Request, Response } from "express";
import config from "../configs/config.js";
import { IError } from "../interfaces/IError.js";
const errorMiddleware = (
  error: IError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = error.status || 500;
  const message = error.message || "SOMETHING WENT WRONG !";
  console.error(`[ErrorMiddleware]: ${req.method} ${req.path}:`, {
    status,
    message,
    stack: error.stack,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  res.status(status).json({
    success: false,
    status,
    message,
    ...(config.node_env === "development" && { stack: error.stack }),
  });
};

export default errorMiddleware;
