import axios from 'axios';
import { auth } from '../firebase';
import { Capacitor } from '@capacitor/core';

const PRODUCTION_API_URL = 'https://time-vault-gamma.vercel.app/api';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 
           (Capacitor.isNativePlatform() ? PRODUCTION_API_URL : (import.meta.env.DEV ? 'http://localhost:5000/api' : PRODUCTION_API_URL))
});

// Attach a fresh Firebase ID token to every outgoing request
api.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// On 401 responses, try refreshing the token once before giving up
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const user = auth.currentUser;
      if (user) {
        const freshToken = await user.getIdToken(/* forceRefresh */ true);
        originalRequest.headers.Authorization = `Bearer ${freshToken}`;
        // Also update the default for future requests
        api.defaults.headers.common['Authorization'] = `Bearer ${freshToken}`;
        return api(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
