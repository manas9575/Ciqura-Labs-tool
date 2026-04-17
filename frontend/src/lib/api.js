import axios from 'axios';

// ✅ Correct env variable + fallback
const BACKEND_URL =
  process.env.REACT_APP_API_URL ||
  "https://ciqura-labs-tool.onrender.com";

// ✅ Axios instance
const api = axios.create({
  baseURL: `${BACKEND_URL}/api`, // ⚠️ keep /api only if your backend uses it
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ✅ Response interceptor (auto refresh token)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const url = error.config?.url || '';

    const isAuthEndpoint =
      url.includes('/auth/me') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/login') ||
      url.includes('/auth/register');

    // 🔄 Handle token expiry
    if (
      error.response?.status === 401 &&
      !error.config._retry &&
      !isAuthEndpoint
    ) {
      error.config._retry = true;

      try {
        await axios.post(
          `${BACKEND_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        return api(error.config);
      } catch {
        // 🔒 Redirect to login if refresh fails
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
export { BACKEND_URL };
