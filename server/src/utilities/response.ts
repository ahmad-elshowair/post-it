import { Response } from 'express';

export const sendResponse = {
  success: <T = unknown>(res: Response, data: T, statusCode: number = 200) => {
    if (data && typeof data === 'object' && 'data' in data && 'pagination' in data) {
      const { data: items, pagination } = data as {
        data: unknown;
        pagination: unknown;
      };
      return res.status(statusCode).json({
        success: true,
        data: items,
        pagination,
      });
    }
    return res.status(statusCode).json({
      success: true,
      data,
    });
  },
  error: <E = unknown>(
    res: Response,
    message = 'Something Went wrong!',
    statusCode: number = 500,
    error: E | null = null,
  ) => {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(error && { error }),
    });
  },
};
