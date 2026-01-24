/**
 * Contexts - Barrel Export
 * Centralized exports for all React contexts
 */

// Auth Context
export {
  AuthProvider,
  useAuth,
  usePermissions,
  useAuthNavigation,
} from './AuthContext'

export type { DepartmentUser } from './AuthContext'

// Socket Context
export {
  SocketProvider,
  useSocket,
  useSocketStatus,
} from './SocketContext'
