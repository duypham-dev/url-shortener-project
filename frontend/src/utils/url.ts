export const getShortUrlDisplay = (shortCode: string): string => {
  const domain = import.meta.env.VITE_API_BASE_URL || "localhost:3000/api/v1";
  
  // Xử lý loại bỏ dấu gạch chéo ở cuối (nếu có) để tránh bị double slashes khi ghép
  const cleanDomain = domain.endsWith('/') ? domain.slice(0, -1) : domain;

  return `${cleanDomain}/${shortCode}`;
};
