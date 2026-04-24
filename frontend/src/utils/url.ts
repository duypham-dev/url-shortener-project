export const getShortUrlDisplay = (shortCode: string): string => {
  // Use the short-link domain, NOT the API base URL.
  // Set VITE_SHORT_LINK_BASE_URL in your .env (e.g. https://short.ly).
  const domain = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // Strip trailing slash to avoid double-slash when concatenating
  const cleanDomain = domain.endsWith('/') ? domain.slice(0, -1) : domain;

  return `${cleanDomain}/${shortCode}`;
};
