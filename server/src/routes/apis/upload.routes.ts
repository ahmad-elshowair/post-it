import { Request, Response, Router } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import config from "../../configs/config.js";
import { sendResponse } from "../../utilities/response.js";
import {
  validateFileMime,
  validateFolderName,
} from "../../utilities/uploadValidation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const uploadRouter = Router();

/**
 * Using memoryStorage as a secure landing zone to allow magic-byte validation
 * before committing the file to the persistent filesystem.
 */
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: config.upload_max_size_bytes, // US2-2: 5MB limit
  },
});

// ───── UPLOAD ROUTE ──────────────────────────────

/**
 * Enhanced Secure File Upload Endpoint
 * Implements:
 * - Magic-byte MIME validation (US2-1)
 * - 5MB size limit enforcement (US2-2)
 * - Path traversal protection via folder allow-list (US2-3)
 */
uploadRouter.post("/", (req: Request, res: Response) => {
  // Use a custom wrapper for upload middleware to catch Multer errors (like 413)
  upload.single("file")(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return sendResponse.error(res, "File exceeds 5MB size limit", 413);
      }
      return sendResponse.error(res, `Upload error: ${err.message}`, 400);
    } else if (err) {
      return sendResponse.error(
        res,
        "An unexpected error occurred during upload",
        500,
      );
    }

    try {
      const { folder = "posts" } = req.body;

      // 1. Validate Upload Presence
      if (!req.file) {
        return sendResponse.error(res, "No file uploaded", 400);
      }

      // 2. Validate Folder (Path Safety / US2-3)
      if (!validateFolderName(folder)) {
        console.warn(
          JSON.stringify({
            level: "warn",
            message: "Security rejection: Invalid folder path",
            type: "UPLOAD_VALIDATION",
            ip: req.ip,
            target: folder,
            reason: "Path traversal attempt or prohibited folder",
          }),
        );
        return sendResponse.error(
          res,
          "Invalid or prohibited target folder",
          400,
        );
      }

      // 3. Validate MIME via Magic Bytes (US2-1)
      const isValidMime = await validateFileMime(req.file.buffer);
      if (!isValidMime) {
        console.warn(
          JSON.stringify({
            level: "warn",
            message: "Security rejection: Invalid MIME type detected",
            type: "UPLOAD_VALIDATION",
            ip: req.ip,
            detectedMime: req.file.mimetype,
            reason: "Magic-byte mismatch or prohibited type",
          }),
        );
        return sendResponse.error(
          res,
          "File content does not match its extension or is prohibited",
          400,
        );
      }

      // 4. Success Path - Persistence
      const date = new Date();
      const uniqueSuffix = `${date.getDate()}-${
        date.getMonth() + 1
      }-${date.getFullYear()}-${date.getMilliseconds()}`;

      // Sanitizing original name to prevent any unexpected issues
      const fileName = `${uniqueSuffix}-${req.file.originalname.replace(
        /[^a-zA-Z0-9.\-]/g,
        "_",
      )}`;
      const uploadPath = path.join(
        __dirname,
        `../../../public/images/${folder}`,
      );

      // Ensure directory exists safely
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      const fullFilePath = path.join(uploadPath, fileName);
      fs.writeFileSync(fullFilePath, req.file.buffer);

      const relativeFilePath = `api/images/${folder}/${fileName}`;

      console.info(
        `[UPLOAD_SUCCESS] File: ${fileName}, Folder: ${folder}, Size: ${req.file.size} bytes`,
      );
      return sendResponse.success(res, relativeFilePath);
    } catch (error) {
      console.error("System error during file processing:", error);
      return sendResponse.error(
        res,
        "Internal server error during file processing",
        500,
      );
    }
  });
});

export default uploadRouter;
