import { fileTypeFromBuffer } from "file-type";
import config from "../configs/config.js";

export const validateFileMime = async (buffer: Buffer): Promise<boolean> => {
  try {
    const typeResult = await fileTypeFromBuffer(buffer);

    if (!typeResult) {
      return false;
    }

    return config.upload_allowed_mimes.includes(typeResult.mime);
  } catch (error) {
    console.error("Error detecting file type:", error);
    return false;
  }
};

/**
 * Validates the folder name to prevent path traversal and ensure it's in the allowed list.
 */
export const validateFolderName = (folder: string): boolean => {
  if (!folder || typeof folder !== "string") return false;

  // Strict allow-list check from configuration
  // This inherently prevents path traversal like "../../etc"
  return config.upload_allowed_folders.includes(folder);
};
