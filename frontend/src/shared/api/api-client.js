import axios from 'axios';
import i18n from '../../app/i18n';

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
  const errorCode = error.response?.data?.errorCode;
  const translationKey = errorCode && `errors.${errorCode}`;

  return translationKey && i18n.exists(translationKey)
    ? i18n.t(translationKey)
    : i18n.t('errors.GENERIC');
}
