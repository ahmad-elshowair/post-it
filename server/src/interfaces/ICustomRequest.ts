import { Request } from "express";
import { IUserPayload } from "./IUserPayload.js";
export interface ICustomRequest extends Request {
  user?: IUserPayload;
  fingerprint?: string;
}
