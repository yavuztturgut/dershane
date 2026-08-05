import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

const titleKeys = {
  '/': 'dashboard',
  '/login': 'login',
  '/forgot-password': 'forgotPassword',
  '/reset-password': 'resetPassword',
  '/users': 'users',
  '/roles': 'roles',
  '/classes': 'classes',
  '/courses': 'courses',
  '/schedules': 'schedules',
  '/attendance': 'attendance',
  '/profile': 'profile',
};

function normalizePath(pathname) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

export function RouteMetadata() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();
  const titleKey = titleKeys[normalizePath(pathname)];

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage || i18n.language;
    document.title = titleKey
      ? `${t('pageTitles.brand')} | ${t(`pageTitles.${titleKey}`)}`
      : t('pageTitles.brand');
  }, [i18n.language, i18n.resolvedLanguage, t, titleKey]);

  return null;
}
