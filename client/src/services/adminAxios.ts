import { createAPIClient } from './apiClient'

const adminAxios = createAPIClient({
  storagePrefix: 'admin',
  loginRedirect: '/admin/login'
})

export function isRateLimited(): boolean {
  return false 
}

export default adminAxios
