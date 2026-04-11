import axios from 'axios'
import { appConfig } from '@/config/app-config'

export const httpClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
  timeout: 20000,
})
