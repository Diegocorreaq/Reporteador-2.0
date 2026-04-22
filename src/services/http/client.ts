import axios from 'axios'
import { appConfig } from '@/config/app-config'

export const httpClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
  timeout: 20000,
  // Required for the HttpOnly session cookie to be sent with every request
  withCredentials: true,
})

// When the server returns 401 (session expired or invalid), notify the app so
// it can clear the local user state and redirect to login.
// Uses a custom event to avoid a circular dependency with the auth store.
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // Only dispatch if we are in a browser context (not SSR/test)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:session-expired'))
      }
    }
    return Promise.reject(error)
  },
)
