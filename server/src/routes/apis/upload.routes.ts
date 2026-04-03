import { Request, Response, Router } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { sendResponse } from "../../utilities/response";

const uploadRouter = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let { folder } = req.body;
    if (!folder) {
      console.error("folder name is undefined ");
      folder = "posts";
    }
    const uploadPath = path.join(__dirname, `../../../public/images/${folder}`);

    // Check if the directory exists
    if (!fs.existsSync(uploadPath)) {
      // If it doesn't exist, create the directory
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const date = new Date();
    const uniqueSuffix = `${date.getDate()}-${
      date.getMonth() + 1
    }-${date.getFullYear()}-${date.getMilliseconds()}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({ storage });

uploadRouter.post("/", upload.single("file"), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      console.warn(
        JSON.stringify({
          level: "warn",
          message: "Upload validation failed",
          type: "UPLOAD_VALIDATION",
          ip: req.ip,
          userId: (req as any).user?.id || "anonymous",
          path: req.path,
          reason: "No file uploaded",
        }),
      );
      return sendResponse.error(res, "No file uploaded", 400);
    }
    // Generate the relative file path for the URL
    const relativeFilePath = `api/images/${req.body.folder}/${req.file.filename}`;
    return sendResponse.success(res, relativeFilePath);
  } catch (error) {
    console.error(error as Error);
    return sendResponse.error<Error>(
      res,
      "Failed to upload file",
      500,
      error as Error
    );
  }
});

export default uploadRouter;
