# Role-Based Access Control (RBAC) Permissions Matrix

## Overview
This document defines all permissions and actions available to each user role in the Student Ticketing System. Use this as the authoritative reference when implementing access control logic.

---

## Role Hierarchy

```
Super Admin (Full Access)
    ↓
Admin (System Management)
    ↓
Department User (Department Scope)
    ↓
Student (Self Scope)
```

**Inheritance:** Higher roles inherit all permissions from lower roles, plus additional privileges.

---

## 1. Student Role

### Ticket Management
| Action | Permission | Restrictions |
|--------|-----------|--------------|
| Create ticket | ✅ Allowed | Can create tickets for themselves only |
| View tickets | ✅ Allowed | Can only view their own tickets |
| Update ticket | ✅ Allowed | Only own tickets with status: `OPEN`, `WAITING_FOR_STUDENT` |
| Delete ticket | ❌ Denied | Cannot delete any tickets |
| Assign ticket | ❌ Denied | Cannot assign tickets to departments/users |
| Close ticket | ❌ Denied | Cannot manually close tickets |
| Reopen ticket | ✅ Allowed | Can reopen own `CLOSED` tickets |
| Add comment | ✅ Allowed | Can comment on own tickets only |
| View ticket history | ✅ Allowed | Can view history of own tickets |
| Export tickets | ❌ Denied | Cannot export ticket data |

### User Management
| Action | Permission | Restrictions |
|--------|-----------|--------------|
| View own profile | ✅ Allowed | Full access to own profile |
| Update own profile | ✅ Allowed | Can update: name, password, email |
| View other users | ❌ Denied | Cannot view other user profiles |
| Create users | ❌ Denied | Cannot create any users |
| Update other users | ❌ Denied | Cannot modify other users |
| Delete users | ❌ Denied | Cannot delete any users |

### Department Management
| Action | Permission | Restrictions |
|--------|-----------|--------------|
| View departments | ✅ Allowed | Read-only list of all departments |
| View SLA rules | ❌ Denied | Cannot view SLA configurations |
| Create department | ❌ Denied | Cannot create departments |
| Update department | ❌ Denied | Cannot modify departments |
| Delete department | ❌ Denied | Cannot delete departments |

### System Access
| Action | Permission | Restrictions |
|--------|-----------|--------------|
| View dashboard | ✅ Allowed | Student dashboard with own ticket stats |
| Access reports | ❌ Denied | Cannot access system reports |
| View audit logs | ❌ Denied | Cannot view system logs |
| System configuration | ❌ Denied | No access to system settings |

---

## 2. Department User Role

### Ticket Management
| Action | Permission | Restrictions |
|--------|-----------|--------------|
| Create ticket | ❌ Denied | Cannot create tickets on behalf of students |
| View tickets | ✅ Allowed | Only tickets assigned to their department |
| Update ticket status | ✅ Allowed | Can update: `OPEN` → `ASSIGNED` → `IN_PROGRESS` → `RESOLVED` |
| Update ticket details | ✅ Allowed | Can update priority, category, notes for dept tickets |
| Delete ticket | ❌ Denied | Cannot delete any tickets |
| Assign ticket | ✅ Allowed | Can assign to users within their department only |
| Close ticket | ❌ Denied | Cannot manually close (auto-closes after resolution) |
| Reopen ticket | ✅ Allowed | Can reopen `RESOLVED` tickets in their department |
| Add comment | ✅ Allowed | Can comment on department tickets |
| View ticket history | ✅ Allowed | Can view history of department tickets |
| Export tickets | ✅ Allowed | Can export department tickets only |
| Filter tickets | ✅ Allowed | By status, priority, student, assigned user |
| Search tickets | ✅ Allowed | Within department scope only |

### User Management
| Action | Permission | Restrictions |
|--------|-----------|--------------|
| View own profile | ✅ Allowed | Full access to own profile |
| Update own profile | ✅ Allowed | Can update: name, password, email |
| View students | ✅ Allowed | Only students who created tickets in their department |
| View dept colleagues | ✅ Allowed | Can view other users in same department |
| View other dept users | ❌ Denied | Cannot view users from other departments |
| Create users | ❌ Denied | Cannot create any users |
| Update users | ❌ Denied | Cannot modify other users |
| Delete users | ❌ Denied | Cannot delete any users |

### Department Management
| Action | Permission | Restrictions |
|--------|-----------|--------------|
| View own department | ✅ Allowed | Full details of their department |
| View SLA rules | ✅ Allowed | Can view SLA rules for their department |
| View other departments | ❌ Denied | Cannot view other department details |
| Create department | ❌ Denied | Cannot create departments |
| Update department | ❌ Denied | Cannot modify department settings |
| Delete department | ❌ Denied | Cannot delete departments |

### System Access
| Action | Permission | Restrictions |
|--------|-----------|--------------|
| View dashboard | ✅ Allowed | Department dashboard with dept ticket stats |
| Access reports | ✅ Allowed | Department-level reports only |
| View audit logs | ❌ Denied | Cannot view system logs |
| System configuration | ❌ Denied | No access to system settings |

---

## 3. Admin Role

### Ticket Management
| Action | Permission | Restrictions |
|--------|-----------|--------------|
| Create ticket | ✅ Allowed | Can create tickets on behalf of students |
| View tickets | ✅ Allowed | Can view ALL tickets across all departments |
| Update ticket | ✅ Allowed | Can update any ticket field |
| Delete ticket | ✅ Allowed | Can delete any ticket |
| Assign ticket | ✅ Allowed | Can assign to any department/user |
| Close ticket | ✅ Allowed | Can manually close any ticket |
| Reopen ticket | ✅ Allowed | Can reopen any closed ticket |
| Add comment | ✅ Allowed | Can comment on any ticket |
| View ticket history | ✅ Allowed | Can view history of any ticket |
| Export tickets | ✅ Allowed | Can export all tickets with filters |
| Bulk operations | ✅ Allowed | Bulk assign, update, close tickets |
| Advanced filters | ✅ Allowed | Filter by any field across all departments |

### User Management
| Action | Permission | Restrictions |
|--------|-----------|--------------|
| View all users | ✅ Allowed | Can view all users in the system |
| Create users | ✅ Allowed | Can create: Student, Department User, Admin |
| Update users | ✅ Allowed | Can update any user except Super Admins |
| Deactivate users | ✅ Allowed | Can deactivate Student, Department User, Admin |
| Delete users | ✅ Allowed | Can delete Student, Department User only |
| Assign roles | ✅ Allowed | Can assign: Student, Department User, Admin |
| Assign departments | ✅ Allowed | Can assign users to departments |
| Reset passwords | ✅ Allowed | Can reset passwords for any user |
| View user activity | ✅ Allowed | Can view login history and activity logs |
| Create Super Admin | ❌ Denied | Cannot create Super Admin users |
| Delete Super Admin | ❌ Denied | Cannot delete Super Admin users |

### Department Management
| Action | Permission | Restrictions |
|--------|-----------|--------------|
| View all departments | ✅ Allowed | Can view all department details |
| Create department | ✅ Allowed | Can create new departments |
| Update department | ✅ Allowed | Can update department name, SLA rules |
| Delete department | ✅ Allowed | Only if no active tickets exist |
| Configure SLA rules | ✅ Allowed | Can set timeout rules for each priority level |
| View dept statistics | ✅ Allowed | Can view stats for all departments |

### System Access
| Action | Permission | Restrictions |
|--------|-----------|--------------|
| View dashboard | ✅ Allowed | Admin dashboard with system-wide stats |
| Access reports | ✅ Allowed | All system reports and analytics |
| View audit logs | ✅ Allowed | Can view user activity and system logs |
| Export data | ✅ Allowed | Can export users, tickets, departments |
| System configuration | ❌ Denied | Cannot modify core system settings |
| Database backup | ❌ Denied | Cannot perform database operations |

---

## 4. Super Admin Role

### All Permissions
| Category | Permission |
|----------|-----------|
| Ticket Management | ✅ All Admin permissions + force delete any ticket |
| User Management | ✅ All Admin permissions + create/delete Super Admins |
| Department Management | ✅ All Admin permissions + delete dept with active tickets |
| System Configuration | ✅ Full access to all system settings |
| Database Operations | ✅ Backup, restore, direct database access |
| Audit Logs | ✅ Full access to all audit logs and system logs |
| Security Settings | ✅ Manage JWT secrets, session timeouts, security policies |
| API Management | ✅ Generate API keys, manage rate limits |

### Exclusive Super Admin Actions
| Action | Description |
|--------|-------------|
| Create Super Admin | Create new Super Admin users |
| Delete Super Admin | Remove Super Admin users |
| Force delete department | Delete departments even with active tickets |
| System maintenance mode | Enable/disable system maintenance mode |
| Database backup/restore | Perform database backup and restore operations |
| Modify system constants | Change core system constants and enums |
| View sensitive logs | Access security logs and authentication failures |
| Manage integrations | Configure external integrations and webhooks |

---

## Permission Constants Reference

### Ticket Permissions
```typescript
CREATE_TICKET              // Create new tickets
VIEW_OWN_TICKETS          // View own tickets only
VIEW_DEPARTMENT_TICKETS   // View tickets in assigned department
VIEW_ALL_TICKETS          // View all tickets system-wide
UPDATE_OWN_TICKETS        // Update own tickets
UPDATE_DEPARTMENT_TICKETS // Update tickets in assigned department
UPDATE_ALL_TICKETS        // Update any ticket
DELETE_TICKETS            // Delete tickets
ASSIGN_TICKETS            // Assign tickets to users/departments
CLOSE_TICKETS             // Manually close tickets
REOPEN_TICKETS            // Reopen closed tickets
EXPORT_TICKETS            // Export ticket data
```

### User Permissions
```typescript
VIEW_OWN_PROFILE          // View own profile
UPDATE_OWN_PROFILE        // Update own profile
VIEW_ALL_USERS            // View all users
VIEW_DEPARTMENT_USERS     // View users in same department
CREATE_USERS              // Create new users
UPDATE_USERS              // Update user details
DELETE_USERS              // Delete users
ASSIGN_ROLES              // Assign roles to users
RESET_PASSWORDS           // Reset user passwords
```

### Department Permissions
```typescript
VIEW_DEPARTMENTS          // View department list
VIEW_OWN_DEPARTMENT       // View own department details
VIEW_ALL_DEPARTMENTS      // View all department details
MANAGE_DEPARTMENTS        // Create/update/delete departments
CONFIGURE_SLA             // Configure SLA rules
```

### System Permissions
```typescript
VIEW_DASHBOARD            // Access dashboard
ACCESS_REPORTS            // Access system reports
VIEW_AUDIT_LOGS           // View audit logs
SYSTEM_CONFIG             // Modify system configuration
DATABASE_OPERATIONS       // Backup/restore database
MANAGE_INTEGRATIONS       // Configure integrations
```

---

## Role-Permission Mapping

```typescript
export const ROLE_PERMISSIONS = {
  [UserRole.STUDENT]: [
    Permission.CREATE_TICKET,
    Permission.VIEW_OWN_TICKETS,
    Permission.UPDATE_OWN_TICKETS,
    Permission.VIEW_OWN_PROFILE,
    Permission.UPDATE_OWN_PROFILE,
    Permission.VIEW_DEPARTMENTS,
  ],
  
  [UserRole.DEPARTMENT_USER]: [
    Permission.VIEW_DEPARTMENT_TICKETS,
    Permission.UPDATE_DEPARTMENT_TICKETS,
    Permission.ASSIGN_TICKETS,
    Permission.REOPEN_TICKETS,
    Permission.EXPORT_TICKETS,
    Permission.VIEW_OWN_PROFILE,
    Permission.UPDATE_OWN_PROFILE,
    Permission.VIEW_DEPARTMENT_USERS,
    Permission.VIEW_OWN_DEPARTMENT,
    Permission.VIEW_DEPARTMENTS,
    Permission.ACCESS_REPORTS,
  ],
  
  [UserRole.ADMIN]: [
    Permission.VIEW_ALL_TICKETS,
    Permission.UPDATE_ALL_TICKETS,
    Permission.DELETE_TICKETS,
    Permission.ASSIGN_TICKETS,
    Permission.CLOSE_TICKETS,
    Permission.REOPEN_TICKETS,
    Permission.EXPORT_TICKETS,
    Permission.VIEW_ALL_USERS,
    Permission.CREATE_USERS,
    Permission.UPDATE_USERS,
    Permission.DELETE_USERS,
    Permission.ASSIGN_ROLES,
    Permission.RESET_PASSWORDS,
    Permission.VIEW_ALL_DEPARTMENTS,
    Permission.MANAGE_DEPARTMENTS,
    Permission.CONFIGURE_SLA,
    Permission.VIEW_DASHBOARD,
    Permission.ACCESS_REPORTS,
    Permission.VIEW_AUDIT_LOGS,
  ],
  
  [UserRole.SUPER_ADMIN]: [
    // All Admin permissions plus:
    Permission.SYSTEM_CONFIG,
    Permission.DATABASE_OPERATIONS,
    Permission.MANAGE_INTEGRATIONS,
    // ... (inherits all Admin permissions)
  ],
};
```

---

## Access Control Examples

### Example 1: Student Creating a Ticket
```typescript
// ✅ Allowed
POST /api/v1/tickets
Authorization: Bearer <student_token>
Body: { subject: "Issue", department: "PLACEMENT" }

// ❌ Denied - Cannot create for another student
POST /api/v1/tickets
Body: { subject: "Issue", studentId: "other_student_id" }
```

### Example 2: Department User Viewing Tickets
```typescript
// ✅ Allowed - Own department
GET /api/v1/tickets/department/PLACEMENT
Authorization: Bearer <placement_dept_user_token>

// ❌ Denied - Different department
GET /api/v1/tickets/department/FINANCE
Authorization: Bearer <placement_dept_user_token>
// Response: 403 Forbidden
```

### Example 3: Admin Managing Users
```typescript
// ✅ Allowed - Create Department User
POST /api/v1/users
Authorization: Bearer <admin_token>
Body: { role: "DEPARTMENT_USER", department: "OPERATIONS" }

// ❌ Denied - Cannot create Super Admin
POST /api/v1/users
Body: { role: "SUPER_ADMIN" }
// Response: 403 Forbidden
```

### Example 4: Ownership Verification
```typescript
// ✅ Allowed - Student updating own ticket
PUT /api/v1/tickets/123
Authorization: Bearer <student_token_who_created_ticket_123>

// ❌ Denied - Student updating another's ticket
PUT /api/v1/tickets/456
Authorization: Bearer <student_token_who_did_not_create_ticket_456>
// Response: 403 Forbidden
```

---

## Implementation Notes

### Middleware Chain Order
```typescript
// Correct order for protected routes:
router.put('/tickets/:id',
  authenticate,           // 1. Verify JWT token
  requireRole(...roles),  // 2. Check role permission
  requireOwnership(...),  // 3. Verify resource ownership
  updateTicket           // 4. Execute controller
);
```

### Department Access Logic
```typescript
// Department users can only access their department
if (user.role === UserRole.DEPARTMENT_USER) {
  if (user.department !== requestedDepartment) {
    throw new AppError('Access denied to this department', 403);
  }
}
```

### Ownership Verification Logic
```typescript
// Students can only modify their own tickets
if (user.role === UserRole.STUDENT) {
  const ticket = await Ticket.findById(ticketId);
  if (ticket.studentId.toString() !== user.userId) {
    throw new AppError('You can only modify your own tickets', 403);
  }
}

// Admins bypass ownership checks
if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
  // Allow access
}
```

---

## Quick Reference Table

| Action | Student | Dept User | Admin | Super Admin |
|--------|---------|-----------|-------|-------------|
| Create own ticket | ✅ | ❌ | ✅ | ✅ |
| View own tickets | ✅ | ✅ | ✅ | ✅ |
| View dept tickets | ❌ | ✅ | ✅ | ✅ |
| View all tickets | ❌ | ❌ | ✅ | ✅ |
| Update own ticket | ✅ | ✅ | ✅ | ✅ |
| Update dept ticket | ❌ | ✅ | ✅ | ✅ |
| Update any ticket | ❌ | ❌ | ✅ | ✅ |
| Delete ticket | ❌ | ❌ | ✅ | ✅ |
| Assign ticket | ❌ | ✅ (dept) | ✅ | ✅ |
| Create user | ❌ | ❌ | ✅ (limited) | ✅ |
| Delete user | ❌ | ❌ | ✅ (limited) | ✅ |
| Manage departments | ❌ | ❌ | ✅ | ✅ |
| System config | ❌ | ❌ | ❌ | ✅ |
| Database ops | ❌ | ❌ | ❌ | ✅ |

---

