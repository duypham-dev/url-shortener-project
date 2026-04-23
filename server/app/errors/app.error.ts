// Define validation error details
export interface ValidationErrorDetail {
  field: string;
  message: string;
}

// Define ErrorDetails
export type ErrorDetails = 
  | Record<string, unknown> 
  | string[] 
  | ValidationErrorDetail[]
  | null;

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: ErrorDetails;

  constructor(statusCode: number, code: string, message: string, details: ErrorDetails = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", details: ErrorDetails = null) {
    super(400, "BAD_REQUEST", message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", details: ErrorDetails = null) {
    super(401, "UNAUTHORIZED", message, details);
  }
}

export class PaymentRequiredError extends AppError {
  constructor(message = "Payment required", details: ErrorDetails = null) {
    super(402, "PAYMENT_REQUIRED", message, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", details: ErrorDetails = null) {
    super(403, "FORBIDDEN", message, details);
  }
}

export class QuotaExceededError extends AppError {
  constructor(message = "Quota exceeded", details: ErrorDetails = null) {
    super(403, "QUOTA_EXCEEDED", message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found", details: ErrorDetails = null) {
    super(404, "NOT_FOUND", message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", details: ErrorDetails = null) {
    super(409, "CONFLICT", message, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details: ErrorDetails = null) {
    super(422, "VALIDATION_ERROR", message, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests", details: ErrorDetails = null) {
    super(429, "TOO_MANY_REQUESTS", message, details);
  }
}

export class InternalServerError extends AppError {
  constructor(message = "Internal server error", details: ErrorDetails = null) {
    super(500, "INTERNAL_SERVER_ERROR", message, details);
  }
}

export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};
