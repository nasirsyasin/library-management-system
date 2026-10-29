import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const requestUrl = axios.isAxiosError(error) ? error.config?.url ?? "" : "";
    const isAuthRequest = /(?:^|\/)auth\/(?:login|me|register)(?:[?#]|$)/.test(requestUrl);

    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !isAuthRequest
    ) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;