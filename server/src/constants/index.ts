// User Roles
export enum UserRole {
  STUDENT = 'STUDENT',
  DEPARTMENT_USER = 'DEPARTMENT_USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

// Departments
export enum Department {
  PLACEMENT = 'PLACEMENT',
  OPERATIONS = 'OPERATIONS',
  TRAINING = 'TRAINING',
  FINANCE = 'FINANCE',
  TECHNICAL_SUPPORT = 'TECHNICAL_SUPPORT',
  HR = 'HR',
}

// Ticket Status
export enum TicketStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_FOR_STUDENT = 'WAITING_FOR_STUDENT',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED',
}

// Priority Levels
export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}
