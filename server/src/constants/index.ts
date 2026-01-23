// User Roles
export enum UserRole {
  USER = 'USER',
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

// Public-facing departments (visible to employees/guests)
export const PUBLIC_DEPARTMENTS = [
  Department.OPERATIONS,
  Department.FINANCE,
  Department.PLACEMENT,
  Department.TRAINING,
];

// Internal-only departments (visible only to staff for restricted/internal requests)
export const INTERNAL_DEPARTMENTS = [
  Department.TECHNICAL_SUPPORT,
  Department.HR,
];

// Ticket Status
export enum TicketStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_FOR_USER = 'WAITING_FOR_USER',
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
