/* global __REACT_APP_API_URL__:readonly, __REACT_APP_SOCKET_URL__:readonly */
const trimTrailingSlash = (value) => {
  if (!value) {
    return value;
  }
  return value.replace(/\/+$/, '');
};

const readWindowEnv = () => {
  if (typeof window === 'undefined') {
    return {};
  }

  return window.__ENV__ ?? {};
};

const readBuildEnv = (key) => {
  const importMetaEnv = (import.meta && import.meta.env) || {};
  const importMetaValue = importMetaEnv[key];
  if (importMetaValue) {
    return importMetaValue;
  }

  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }

  if (typeof __REACT_APP_API_URL__ !== 'undefined' && key === 'REACT_APP_API_URL') {
    return __REACT_APP_API_URL__;
  }

  if (typeof __REACT_APP_SOCKET_URL__ !== 'undefined' && key === 'REACT_APP_SOCKET_URL') {
    return __REACT_APP_SOCKET_URL__;
  }

  return undefined;
};

const resolveValue = (windowKey, buildKey, fallback) => {
  const windowValue = readWindowEnv()[windowKey];
  if (windowValue) {
    return windowValue;
  }

  const buildValue = readBuildEnv(buildKey);
  if (buildValue) {
    return buildValue;
  }

  return fallback;
};

export const getApiBaseUrl = () => {
  const importMetaEnv = (import.meta && import.meta.env) || {};
  return trimTrailingSlash(resolveValue('API_URL', 'REACT_APP_API_URL', importMetaEnv.VITE_API_URL ?? 'http://localhost:3001'));
};

export const getSocketUrl = () => {
  const importMetaEnv = (import.meta && import.meta.env) || {};
  return trimTrailingSlash(
    resolveValue(
      'SOCKET_URL',
      'REACT_APP_SOCKET_URL',
      resolveValue('API_URL', 'REACT_APP_API_URL', importMetaEnv.VITE_API_URL ?? 'http://localhost:3001')
    )
  );
};

export const getRestApiBaseUrl = () => `${getApiBaseUrl()}/api`;
