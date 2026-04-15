/**
 * Standardized API Response Helper
 */
import type { Response } from "express";

interface PaginationInput {
  page: number;
  limit: number;
  total: number;
}

interface ErrorResponseBody {
  success: false;
  message: string;
  errors?: unknown;
}

export class ApiResponse {
  static success<T>(res: Response, data: T, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static error(res: Response, message = 'Error', statusCode = 500, errors: unknown = null) {
    const response: ErrorResponseBody = {
      success: false,
      message,
    };

    if (errors !== null) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  static created<T>(res: Response, data: T, message = 'Created successfully') {
    return this.success(res, data, message, 201);
  }

  static noContent(res: Response, message = 'No content') {
    return res.status(204).json({
      success: true,
      message,
    });
  }

  static paginated<T>(res: Response, data: T, pagination: PaginationInput, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.limit),
      },
    });
  }
}
