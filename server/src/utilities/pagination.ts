import { Request } from "express";
import {
  ICursorPaginationOptions,
  IPaginatedResult,
} from "../interfaces/IPagination";

export const getCursorPaginationOptions = (req: Request): ICursorPaginationOptions => {
  const limit = parseInt(req.query.limit as string) || 10;
  return {
    limit: limit + 1,
    originalLimit: limit,
    cursor: req.query.cursor as string | undefined,
    direction: (req.query.direction as "next" | "previous") || "next",
  };
};

export const createPaginationResult = <T>(
  data: T[],
  options: ICursorPaginationOptions,
  idField: keyof T
): IPaginatedResult<T> => {
  const hasMore = data.length > options.originalLimit;
  const items = hasMore ? data.slice(0, options.originalLimit) : data;

  const lastItem = items[items.length - 1];
  const firstItem = items[0];

  return {
    data: items,
    pagination: {
      hasMore,
      nextCursor: hasMore && lastItem ? String(lastItem[idField]) : undefined,
      previousCursor: firstItem ? String(firstItem[idField]) : undefined,
    },
  };
};
