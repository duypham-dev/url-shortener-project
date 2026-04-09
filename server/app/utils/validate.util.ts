/**
 * validate.util.ts
 * Các hàm validate input không dùng thư viện nặng,
 * giữ dependencies tối thiểu. Có thể thay bằng zod nếu cần.
 */

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// ----------------------------------------------------------------
// Validate register input
// ----------------------------------------------------------------
export const validateRegisterInput = (body: {
  username?: unknown;
  email?: unknown;
  password?: unknown;
}): ValidationResult => {
  const errors: Record<string, string> = {};

  // Username
  if (!body.username || typeof body.username !== "string") {
    errors["username"] = "Username là bắt buộc.";
  } else if (body.username.trim().length < 3 || body.username.trim().length > 50) {
    errors["username"] = "Username phải từ 3 đến 50 ký tự.";
  } else if (!/^[a-zA-Z0-9_]+$/.test(body.username.trim())) {
    errors["username"] = "Username chỉ được chứa chữ cái, số và dấu gạch dưới.";
  }

  // Email
  if (!body.email || typeof body.email !== "string") {
    errors["email"] = "Email là bắt buộc.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    errors["email"] = "Email không đúng định dạng.";
  }

  // Password
  if (!body.password || typeof body.password !== "string") {
    errors["password"] = "Password là bắt buộc.";
  } else if (body.password.length < 8) {
    errors["password"] = "Password phải có ít nhất 8 ký tự.";
  } else if (!/(?=.*[A-Z])(?=.*[0-9])/.test(body.password)) {
    errors["password"] = "Password phải chứa ít nhất 1 chữ hoa và 1 chữ số.";
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};

// ----------------------------------------------------------------
// Validate login input
// ----------------------------------------------------------------
export const validateLoginInput = (body: {
  email?: unknown;
  password?: unknown;
}): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!body.email || typeof body.email !== "string" || !body.email.trim()) {
    errors["email"] = "Email là bắt buộc.";
  }

  if (!body.password || typeof body.password !== "string" || !body.password) {
    errors["password"] = "Password là bắt buộc.";
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};