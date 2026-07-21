import axios from 'axios';

let unauthorizedHandler;

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }

    return Promise.reject(error);
  },
);

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export function getErrorMessage(error) {
  return error.response?.data?.error || 'Something went wrong. Please try again.';
}
