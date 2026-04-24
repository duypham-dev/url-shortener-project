import type { Request, Response, NextFunction } from "express";
import { ZodObject, type ZodRawShape, ZodError } from "zod";
import { ValidationError } from "../errors/app.error.js"; // Import class lỗi của bạn

export const validate =
  (schema: ZodObject<ZodRawShape>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { body, query, params } = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (body) req.body = body;
      if (params) req.params = params as typeof req.params;
      if (query) {
        Object.defineProperty(req, "query", {
          value: query,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      // pass if validate success
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new ValidationError(
            "Input validation failed",
            error.issues.map((issue) => ({
              field: issue.path.join("."),
              message: issue.message,
            })),
          ),
        );
      } else {
        next(error);
      }
    }
  };
