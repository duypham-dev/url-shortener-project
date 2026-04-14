// ============================================================
// Kiểu dữ liệu người dùng (dùng xuyên suốt app)
// ============================================================
export interface User {
  userId: number;
  fullName: string;
  email: string;
  role: string;
}

// ============================================================
// Input cho từng request
// ============================================================
export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
}

// ============================================================
// Response trả về từ /auth/login và /auth/register
// ============================================================
export interface AuthApiResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    user: User;
  };
}

// ============================================================
// Response trả về từ /auth/refresh
// ============================================================
export interface RefreshApiResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
  };
}

// ============================================================
// Response trả về từ /auth/me
// JWT payload chứa userId (không phải id), nên cần map lại
// ============================================================
export interface MeApiResponse {
  success: boolean;
  data: {
    user: {
      fullName: string;
      userId: number;
      email: string;
      role: string;
    };
  };
}
