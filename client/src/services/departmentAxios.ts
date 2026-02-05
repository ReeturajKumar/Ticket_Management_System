import { createAPIClient } from './apiClient'

const departmentAxios = createAPIClient({
  storagePrefix: 'dept',
  loginRedirect: '/department/login'
})

export default departmentAxios
