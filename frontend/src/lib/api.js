import axios from 'axios';

// ✅ Backend URL (env + fallback)
const BACKEND_URL =
  process.env.REACT_APP_API_URL ||
  "https://ciqura-labs-tool.onrender.com";

// ✅ Axios instance (cookie-based auth)
const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  withCredentials: true, // 🔥 VERY IMPORTANT for cookies
  headers: {
    'Content-Type': 'application/json'
  }
});


// ❌ NO request interceptor (no Authorization header)


// ✅ Response interceptor (optional refresh handling)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const url = error.config?.url || '';

    const isAuthEndpoint =
      url.includes('/auth/me') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/login') ||
      url.includes('/auth/register');

    if (
      error.response?.status === 401 &&
      !error.config?._retry &&
      !isAuthEndpoint
    ) {
      error.config._retry = true;

      try {
        // 🔄 try refreshing cookie session
        await axios.post(
          `${BACKEND_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        return api(error.config);
      } catch {
        // 🔒 redirect to login if refresh fails
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
