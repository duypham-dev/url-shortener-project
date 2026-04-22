import type { Request, Response, NextFunction } from "express";
import { ZodObject, ZodError } from "zod";
import { ValidationError } from "../errors/app.error.js"; // Import class lỗi của bạn

export const validate =
  (schema: ZodObject) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // validate body, query, params
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // pass if validate success
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format lại lỗi của Zod thành mảng dễ đọc cho frontend
        const formattedErrors = error.issues.map((err) => ({
          field: err.path.join("."), // Ví dụ: "body.email"
          message: err.message,
        }));

        // Pass to Global Error Handler to return 422
        next(new ValidationError("Dữ liệu đầu vào không hợp lệ", formattedErrors));
      } else {
        next(error); // Unknown error
      }
    }
  };