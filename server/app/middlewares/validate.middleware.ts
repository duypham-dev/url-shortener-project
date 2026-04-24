import type { Request, Response, NextFunction } from "express";
import { ZodObject, type ZodRawShape, ZodError } from "zod";
import { ValidationError } from "../errors/app.error.js"; // Import class lỗi của bạn

export const validate =
  (schema: ZodObject<ZodRawShape>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // validate body, query, params
      const validatedData = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      if (validatedData.body)   req.body   = validatedData.body;
      if (validatedData.query)  req.query  = validatedData.query as typeof req.query;
      if (validatedData.params) req.params = validatedData.params as typeof req.params;;
      // pass if validate success
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Formatted errors to match ValidationErrorDetail
        const formattedErrors = error.issues.map((err) => ({
          field: err.path.join("."), // Example: "body.email"
          message: err.message,
        }));

        // Pass to Global Error Handler to return 422
        next(new ValidationError("Input validation failed", formattedErrors));
      } else {
        next(error); // Unknown error
      }
    }
  };