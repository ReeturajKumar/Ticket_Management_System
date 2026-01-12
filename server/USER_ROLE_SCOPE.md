# User Role Scope & Permissions - Detailed Documentation

## Overview
This document provides an in-depth analysis of the **User Role** concept in the Student Ticketing System, explaining the role hierarchy, permission scopes, and implementation details for role-based access control.

---

## Table of Contents
1. [Role Definitions](#role-definitions)
2. [Role Hierarchy & Inheritance](#role-hierarchy--inheritance)
3. [Scope of Access](#scope-of-access)
4. [Detailed Role Breakdown](#detailed-role-breakdown)
5. [Permission Implementation](#permission-implementation)
6. [Access Control Flow](#access-control-flow)
7. [Use Cases & Scenarios](#use-cases--scenarios)

---

## Role Definitions

### What is a User Role?
A **User Role** is a classification that determines what actions a user can perform and what data they can access within the system. Each role has a specific **scope of access** and a defined set of **permissions**.

### The Four Roles

#### 1. **Student** (Base Role)
- **Purpose**: End users who need support
- **Scope**: Self (own data only)
- **Primary Function**: Create and track personal support tickets
- **Access Level**: Minimal - restricted to own resources

#### 2. **Department User** (Support Staff)
- **Purpose**: Staff members who handle tickets for a specific department
- **Scope**: Department (assigned department data)
- **Primary Function**: Manage and resolve tickets within their department
- **Access Level**: Medium - department-wide access

#### 3. **Admin** (System Manager)
- **Purpose**: System administrators who manage the entire ticketing system
- **Scope**: System-wide (all data except super admin functions)
- **Primary Function**: Manage users, tickets, and departments across the system
- **Access Level**: High - full system access with some restrictions

#### 4. **Super Admin** (System Owner)
- **Purpose**: Technical administrators with complete system control
- **Scope**: Unrestricted (all data and system configuration)
- **Primary Function**: System configuration, security, and critical operations
- **Access Level**: Maximum - no restrictions

---

## Role Hierarchy & Inheritance

### Hierarchical Structure

```
┌─────────────────────────────────────┐
│        SUPER ADMIN                  │  ← Full System Control
│  (Unrestricted Access)              │
└─────────────────────────────────────┘
              ↓ inherits all from
┌─────────────────────────────────────┐
│           ADMIN                     │  ← System Management
│  (System-wide Access)               │
└─────────────────────────────────────┘
              ↓ inherits all from
┌─────────────────────────────────────┐
│      DEPARTMENT USER                │  ← Department Support
│  (Department-scoped Access)         │
└─────────────────────────────────────┘
              ↓ inherits all from
┌─────────────────────────────────────┐
│         STUDENT                     │  ← End User
│  (Self-scoped Access)               │
└─────────────────────────────────────┘
```

### Inheritance Rules

1. **Higher roles inherit lower role permissions**
   - Admin can do everything Department User can do, plus more
   - Super Admin can do everything Admin can do, plus more

2. **Scope expansion**
   - Student: Self only
   - Department User: Self + Department
   - Admin: Self + All Departments + System
   - Super Admin: Everything + System Configuration

3. **Permission addition**
   - Each higher role adds new permissions
   - Lower permissions are never removed, only expanded

---

## Scope of Access

### 1. Student Scope (Self-Scoped)

**Data Visibility:**
```
User: John (Student)
Can Access:
  ✅ Own Profile
  ✅ Own Tickets (created by John)
  ✅ Department List (read-only)
  
Cannot Access:
  ❌ Other students' profiles
  ❌ Other students' tickets
  ❌ Department user profiles
  ❌ Admin profiles
  ❌ System settings
```

**Example Query:**
```typescript
// Student viewing tickets
const tickets = await Ticket.find({ 
  studentId: currentUser.userId  // Only own tickets
});
```

---

### 2. Department User Scope (Department-Scoped)

**Data Visibility:**
```
User: Sarah (Department User - PLACEMENT)
Can Access:
  ✅ Own Profile
  ✅ All tickets assigned to PLACEMENT department
  ✅ Students who created PLACEMENT tickets
  ✅ Other PLACEMENT department users
  ✅ PLACEMENT department details & SLA rules
  
Cannot Access:
  ❌ FINANCE department tickets
  ❌ OPERATIONS department tickets
  ❌ Students who never created PLACEMENT tickets
  ❌ Users from other departments
  ❌ System-wide reports
```

**Example Query:**
```typescript
// Department User viewing tickets
const tickets = await Ticket.find({ 
  department: currentUser.department  // Only dept tickets
});
```

**Department Boundary Enforcement:**
```typescript
// Middleware checks department access
if (user.role === UserRole.DEPARTMENT_USER) {
  if (requestedDepartment !== user.department) {
    throw new AppError('Access denied to this department', 403);
  }
}
```

---

### 3. Admin Scope (System-Wide)

**Data Visibility:**
```
User: Mike (Admin)
Can Access:
  ✅ All tickets across all departments
  ✅ All users (Students, Dept Users, Admins)
  ✅ All departments and their settings
  ✅ System-wide reports and analytics
  ✅ Audit logs
  
Cannot Access:
  ❌ Super Admin user management
  ❌ System configuration (JWT secrets, etc.)
  ❌ Database operations
```

**Example Query:**
```typescript
// Admin viewing all tickets
const tickets = await Ticket.find({});  // No restrictions

// Admin creating users (with role restriction)
if (newUser.role === UserRole.SUPER_ADMIN) {
  throw new AppError('Cannot create Super Admin users', 403);
}
```

---

### 4. Super Admin Scope (Unrestricted)

**Data Visibility:**
```
User: Alex (Super Admin)
Can Access:
  ✅ Everything Admin can access
  ✅ Super Admin user management
  ✅ System configuration
  ✅ Database backup/restore
  ✅ Security settings
  ✅ API management
  
No Restrictions
```

**Example Operations:**
```typescript
// Super Admin exclusive operations
await SystemConfig.update({ jwtSecret: newSecret });
await Database.backup();
await User.create({ role: UserRole.SUPER_ADMIN });
```

---

## Detailed Role Breakdown

### Student Role - Complete Specification

#### Core Characteristics
- **Identifier**: `UserRole.STUDENT`
- **Database Field**: `role: 'STUDENT'`
- **Default Role**: Yes (assigned on registration)
- **Requires Department**: No
- **Can Be Assigned By**: Admin, Super Admin

#### Permissions Matrix

##### Ticket Operations
| Operation | Allowed | Conditions | HTTP Status on Denial |
|-----------|---------|------------|----------------------|
| Create ticket | ✅ Yes | Must be for self | - |
| View own tickets | ✅ Yes | Only tickets where `studentId === userId` | - |
| View other tickets | ❌ No | - | 403 Forbidden |
| Update own ticket | ✅ Yes | Only if status is `OPEN` or `WAITING_FOR_STUDENT` | 403 Forbidden |
| Update other tickets | ❌ No | - | 403 Forbidden |
| Delete any ticket | ❌ No | - | 403 Forbidden |
| Assign ticket | ❌ No | - | 403 Forbidden |
| Close ticket | ❌ No | Auto-closed by system | 403 Forbidden |
| Reopen ticket | ✅ Yes | Only own `CLOSED` tickets | 403 Forbidden |
| Add comment | ✅ Yes | Only to own tickets | 403 Forbidden |
| View history | ✅ Yes | Only for own tickets | 403 Forbidden |
| Export tickets | ❌ No | - | 403 Forbidden |

##### User Operations
| Operation | Allowed | Conditions | HTTP Status on Denial |
|-----------|---------|------------|----------------------|
| View own profile | ✅ Yes | Full access | - |
| Update own profile | ✅ Yes | Can update: name, email, password | - |
| Change own role | ❌ No | - | 403 Forbidden |
| View other profiles | ❌ No | - | 403 Forbidden |
| Create users | ❌ No | - | 403 Forbidden |
| Update other users | ❌ No | - | 403 Forbidden |
| Delete users | ❌ No | - | 403 Forbidden |

##### Department Operations
| Operation | Allowed | Conditions | HTTP Status on Denial |
|-----------|---------|------------|----------------------|
| View dept list | ✅ Yes | Read-only, basic info | - |
| View dept details | ❌ No | Cannot see SLA rules | 403 Forbidden |
| Create department | ❌ No | - | 403 Forbidden |
| Update department | ❌ No | - | 403 Forbidden |
| Delete department | ❌ No | - | 403 Forbidden |

##### System Operations
| Operation | Allowed | Conditions | HTTP Status on Denial |
|-----------|---------|------------|----------------------|
| View dashboard | ✅ Yes | Student dashboard only | - |
| Access reports | ❌ No | - | 403 Forbidden |
| View audit logs | ❌ No | - | 403 Forbidden |
| System config | ❌ No | - | 403 Forbidden |

#### API Endpoints Available to Students

```typescript
// Authentication (Public)
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

// Profile Management (Protected - Student)
GET    /api/v1/profile
PUT    /api/v1/profile
PATCH  /api/v1/profile/password

// Ticket Management (Protected - Student)
POST   /api/v1/tickets                    // Create own ticket
GET    /api/v1/tickets                    // List own tickets
GET    /api/v1/tickets/:id                // View own ticket
PUT    /api/v1/tickets/:id                // Update own ticket (if OPEN)
POST   /api/v1/tickets/:id/comments       // Add comment to own ticket
PATCH  /api/v1/tickets/:id/reopen         // Reopen own closed ticket

// Department (Protected - Student)
GET    /api/v1/departments                // List departments (read-only)

// Dashboard (Protected - Student)
GET    /api/v1/dashboard/student          // Student dashboard stats
```

#### Middleware Protection Examples

```typescript
// Student creating a ticket
router.post('/tickets',
  authenticate,                    // Verify JWT
  requireRole(UserRole.STUDENT),   // Must be student
  createTicket                     // Controller
);

// Student viewing tickets (automatic filtering)
router.get('/tickets',
  authenticate,
  requireRole(UserRole.STUDENT),
  getStudentTickets               // Returns only own tickets
);

// Student updating ticket (with ownership check)
router.put('/tickets/:id',
  authenticate,
  requireRole(UserRole.STUDENT),
  requireOwnership('ticket'),     // Verify owns this ticket
  requireTicketStatus(['OPEN', 'WAITING_FOR_STUDENT']),
  updateTicket
);
```

#### Business Logic Examples

##### Creating a Ticket
```typescript
export const createTicket = async (req: Request, res: Response) => {
  const { subject, description, department, priority } = req.body;
  const studentId = req.user!.userId;  // From JWT token
  
  // Student can only create tickets for themselves
  const ticket = await Ticket.create({
    studentId,  // Always set to current user
    subject,
    description,
    department,
    priority: priority || Priority.MEDIUM,
    status: TicketStatus.OPEN,
  });
  
  res.status(201).json({
    success: true,
    message: 'Ticket created successfully',
    data: { ticket }
  });
};
```

##### Viewing Tickets
```typescript
export const getStudentTickets = async (req: Request, res: Response) => {
  const studentId = req.user!.userId;
  
  // Automatically filter to only student's tickets
  const tickets = await Ticket.find({ studentId })
    .populate('assignedTo', 'name email')
    .sort({ createdAt: -1 });
  
  res.json({
    success: true,
    data: { tickets, count: tickets.length }
  });
};
```

##### Updating a Ticket
```typescript
export const updateTicket = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { description, priority } = req.body;
  const studentId = req.user!.userId;
  
  const ticket = await Ticket.findById(id);
  
  // Ownership check (done by middleware, but shown for clarity)
  if (ticket.studentId.toString() !== studentId) {
    throw new AppError('You can only update your own tickets', 403);
  }
  
  // Status check
  if (!['OPEN', 'WAITING_FOR_STUDENT'].includes(ticket.status)) {
    throw new AppError('Cannot update ticket in current status', 403);
  }
  
  // Students can only update certain fields
  ticket.description = description || ticket.description;
  ticket.priority = priority || ticket.priority;
  // Cannot update: status, department, assignedTo
  
  await ticket.save();
  
  res.json({
    success: true,
    message: 'Ticket updated successfully',
    data: { ticket }
  });
};
```

---

### Department User Role - Complete Specification

#### Core Characteristics
- **Identifier**: `UserRole.DEPARTMENT_USER`
- **Database Field**: `role: 'DEPARTMENT_USER'`
- **Default Role**: No
- **Requires Department**: Yes (mandatory)
- **Can Be Assigned By**: Admin, Super Admin

#### Department Assignment
```typescript
// Department is required for this role
const departmentUser = {
  name: 'Sarah Johnson',
  email: 'sarah@example.com',
  role: UserRole.DEPARTMENT_USER,
  department: Department.PLACEMENT  // REQUIRED
};

// Validation in User model
required: function() {
  return this.role === UserRole.DEPARTMENT_USER;
}
```

#### Permissions Matrix

##### Ticket Operations
| Operation | Allowed | Scope | Conditions |
|-----------|---------|-------|------------|
| Create ticket | ❌ No | - | Cannot create on behalf of students |
| View tickets | ✅ Yes | Department only | Only tickets where `department === user.department` |
| Update ticket status | ✅ Yes | Department only | Can change status through workflow |
| Update ticket details | ✅ Yes | Department only | Can update priority, category, notes |
| Delete ticket | ❌ No | - | Cannot delete any tickets |
| Assign ticket | ✅ Yes | Department only | Can assign to users in same department |
| Close ticket | ❌ No | - | Auto-closes after resolution |
| Reopen ticket | ✅ Yes | Department only | Can reopen `RESOLVED` tickets |
| Add comment | ✅ Yes | Department only | Can comment on dept tickets |
| View history | ✅ Yes | Department only | Can view dept ticket history |
| Export tickets | ✅ Yes | Department only | Can export dept tickets |
| Filter/Search | ✅ Yes | Department only | Advanced filtering within dept |

##### User Operations
| Operation | Allowed | Scope | Conditions |
|-----------|---------|-------|------------|
| View own profile | ✅ Yes | Self | Full access |
| Update own profile | ✅ Yes | Self | Can update name, email, password |
| View students | ✅ Yes | Department context | Only students who created dept tickets |
| View dept colleagues | ✅ Yes | Same department | Other users in same department |
| View other dept users | ❌ No | - | Cannot view users from other departments |
| Create users | ❌ No | - | Cannot create any users |
| Update users | ❌ No | - | Cannot modify other users |
| Delete users | ❌ No | - | Cannot delete any users |

##### Department Operations
| Operation | Allowed | Scope | Conditions |
|-----------|---------|-------|------------|
| View own dept | ✅ Yes | Own department | Full details including SLA rules |
| View other depts | ❌ No | - | Cannot view other department details |
| Create department | ❌ No | - | Cannot create departments |
| Update department | ❌ No | - | Cannot modify department settings |
| Delete department | ❌ No | - | Cannot delete departments |

##### System Operations
| Operation | Allowed | Scope | Conditions |
|-----------|---------|-------|------------|
| View dashboard | ✅ Yes | Department | Department dashboard with stats |
| Access reports | ✅ Yes | Department | Department-level reports only |
| View audit logs | ❌ No | - | Cannot view system logs |
| System config | ❌ No | - | No access to system settings |

#### API Endpoints Available to Department Users

```typescript
// Ticket Management (Protected - Department User)
GET    /api/v1/tickets/department/:department   // List dept tickets
GET    /api/v1/tickets/:id                      // View dept ticket
PUT    /api/v1/tickets/:id                      // Update dept ticket
PATCH  /api/v1/tickets/:id/assign               // Assign to dept user
PATCH  /api/v1/tickets/:id/status               // Update status
PATCH  /api/v1/tickets/:id/reopen               // Reopen resolved ticket
POST   /api/v1/tickets/:id/comments             // Add comment
GET    /api/v1/tickets/export                   // Export dept tickets

// User Management (Protected - Department User)
GET    /api/v1/users/department/:department     // List dept users
GET    /api/v1/users/students                   // Students with dept tickets

// Department (Protected - Department User)
GET    /api/v1/departments/:department          // Own dept details

// Dashboard (Protected - Department User)
GET    /api/v1/dashboard/department             // Dept dashboard stats
GET    /api/v1/reports/department               // Dept reports
```

#### Middleware Protection Examples

```typescript
// Department user viewing tickets
router.get('/tickets/department/:department',
  authenticate,
  requireRole(UserRole.DEPARTMENT_USER),
  requireDepartment('department'),    // Verify dept matches
  getDepartmentTickets
);

// Department user assigning ticket
router.patch('/tickets/:id/assign',
  authenticate,
  requireRole(UserRole.DEPARTMENT_USER),
  requireTicketDepartment(),          // Verify ticket is in user's dept
  assignTicket
);
```

#### Department Boundary Enforcement

```typescript
// Middleware: requireDepartment
export const requireDepartment = (paramName: string = 'department') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user!;
    const requestedDept = req.params[paramName];
    
    // Department users can only access their own department
    if (user.role === UserRole.DEPARTMENT_USER) {
      if (user.department !== requestedDept) {
        throw new AppError(
          'Access denied: You can only access your own department',
          403
        );
      }
    }
    
    // Admins can access any department
    next();
  };
};

// Middleware: requireTicketDepartment
export const requireTicketDepartment = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user!;
    const ticketId = req.params.id;
    
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }
    
    // Department users can only access tickets in their department
    if (user.role === UserRole.DEPARTMENT_USER) {
      if (ticket.department !== user.department) {
        throw new AppError(
          'Access denied: This ticket belongs to another department',
          403
        );
      }
    }
    
    // Attach ticket to request for controller use
    req.ticket = ticket;
    next();
  };
};
```

#### Business Logic Examples

##### Viewing Department Tickets
```typescript
export const getDepartmentTickets = async (req: Request, res: Response) => {
  const { department } = req.params;
  const { status, priority, studentId } = req.query;
  
  // Build query (department already verified by middleware)
  const query: any = { department };
  
  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (studentId) query.studentId = studentId;
  
  const tickets = await Ticket.find(query)
    .populate('studentId', 'name email')
    .populate('assignedTo', 'name email')
    .sort({ createdAt: -1 });
  
  res.json({
    success: true,
    data: { tickets, count: tickets.length }
  });
};
```

##### Assigning Ticket
```typescript
export const assignTicket = async (req: Request, res: Response) => {
  const { assignedTo } = req.body;
  const ticket = req.ticket!;  // Attached by middleware
  const user = req.user!;
  
  // Verify assignee is in the same department
  const assignee = await User.findById(assignedTo);
  if (!assignee) {
    throw new AppError('Assignee not found', 404);
  }
  
  if (assignee.department !== user.department) {
    throw new AppError(
      'Can only assign to users in your department',
      403
    );
  }
  
  // Update ticket
  ticket.assignedTo = assignedTo;
  ticket.status = TicketStatus.ASSIGNED;
  ticket.history.push({
    action: 'ASSIGNED',
    performedBy: user.userId,
    timestamp: new Date(),
    details: `Assigned to ${assignee.name}`
  });
  
  await ticket.save();
  
  res.json({
    success: true,
    message: 'Ticket assigned successfully',
    data: { ticket }
  });
};
```

---

### Admin Role - Complete Specification

#### Core Characteristics
- **Identifier**: `UserRole.ADMIN`
- **Database Field**: `role: 'ADMIN'`
- **Default Role**: No
- **Requires Department**: No
- **Can Be Assigned By**: Admin, Super Admin
- **Scope**: System-wide (all departments)

#### Permissions Matrix

##### Ticket Operations
| Operation | Allowed | Scope | Restrictions |
|-----------|---------|-------|--------------|
| Create ticket | ✅ Yes | System-wide | Can create for any student |
| View tickets | ✅ Yes | System-wide | All tickets across all departments |
| Update ticket | ✅ Yes | System-wide | Can update any field |
| Delete ticket | ✅ Yes | System-wide | Can delete any ticket |
| Assign ticket | ✅ Yes | System-wide | Can assign to any department/user |
| Close ticket | ✅ Yes | System-wide | Can manually close any ticket |
| Reopen ticket | ✅ Yes | System-wide | Can reopen any ticket |
| Bulk operations | ✅ Yes | System-wide | Bulk assign, update, close |
| Export tickets | ✅ Yes | System-wide | Can export all tickets |

##### User Operations
| Operation | Allowed | Scope | Restrictions |
|-----------|---------|-------|--------------|
| View all users | ✅ Yes | System-wide | All users except sensitive Super Admin data |
| Create users | ✅ Yes | Limited | Can create: Student, Department User, Admin |
| Update users | ✅ Yes | Limited | Cannot update Super Admin users |
| Delete users | ✅ Yes | Limited | Can delete: Student, Department User only |
| Deactivate users | ✅ Yes | Limited | Can deactivate: Student, Department User, Admin |
| Assign roles | ✅ Yes | Limited | Cannot assign Super Admin role |
| Reset passwords | ✅ Yes | System-wide | Can reset any user password |
| View activity logs | ✅ Yes | System-wide | Can view user login history |

##### Department Operations
| Operation | Allowed | Scope | Restrictions |
|-----------|---------|-------|--------------|
| View all depts | ✅ Yes | System-wide | Full details of all departments |
| Create department | ✅ Yes | System-wide | Can create new departments |
| Update department | ✅ Yes | System-wide | Can update name, SLA rules |
| Delete department | ✅ Yes | Conditional | Only if no active tickets exist |
| Configure SLA | ✅ Yes | System-wide | Can set timeout rules |
| View dept stats | ✅ Yes | System-wide | Statistics for all departments |

##### System Operations
| Operation | Allowed | Scope | Restrictions |
|-----------|---------|-------|--------------|
| View dashboard | ✅ Yes | System-wide | Admin dashboard with all stats |
| Access reports | ✅ Yes | System-wide | All system reports and analytics |
| View audit logs | ✅ Yes | System-wide | User activity and system logs |
| Export data | ✅ Yes | System-wide | Can export users, tickets, departments |
| System config | ❌ No | - | Cannot modify core system settings |
| Database ops | ❌ No | - | Cannot perform database operations |

#### API Endpoints Available to Admins

```typescript
// All Student + Department User endpoints, plus:

// User Management (Protected - Admin)
GET    /api/v1/users                           // List all users
POST   /api/v1/users                           // Create user
GET    /api/v1/users/:id                       // View user
PUT    /api/v1/users/:id                       // Update user
DELETE /api/v1/users/:id                       // Delete user
PATCH  /api/v1/users/:id/deactivate            // Deactivate user
PATCH  /api/v1/users/:id/reset-password        // Reset password
GET    /api/v1/users/:id/activity              // View activity

// Ticket Management (Protected - Admin)
GET    /api/v1/tickets                         // All tickets
POST   /api/v1/tickets                         // Create any ticket
DELETE /api/v1/tickets/:id                     // Delete ticket
PATCH  /api/v1/tickets/bulk-assign             // Bulk assign
PATCH  /api/v1/tickets/bulk-close              // Bulk close

// Department Management (Protected - Admin)
GET    /api/v1/departments                     // List all depts
POST   /api/v1/departments                     // Create dept
GET    /api/v1/departments/:id                 // View dept
PUT    /api/v1/departments/:id                 // Update dept
DELETE /api/v1/departments/:id                 // Delete dept
PUT    /api/v1/departments/:id/sla             // Update SLA rules

// Reports & Analytics (Protected - Admin)
GET    /api/v1/reports/tickets                 // Ticket reports
GET    /api/v1/reports/departments             // Dept performance
GET    /api/v1/reports/users                   // User activity
GET    /api/v1/audit-logs                      // System audit logs

// Dashboard (Protected - Admin)
GET    /api/v1/dashboard/admin                 // Admin dashboard
```

#### Middleware Protection Examples

```typescript
// Admin creating users (with role restriction)
router.post('/users',
  authenticate,
  requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateUserCreation,
  createUser
);

// Admin deleting department (with validation)
router.delete('/departments/:id',
  authenticate,
  requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateDepartmentDeletion,
  deleteDepartment
);
```

#### Business Logic Examples

##### Creating Users (with restrictions)
```typescript
export const createUser = async (req: Request, res: Response) => {
  const { name, email, password, role, department } = req.body;
  const currentUser = req.user!;
  
  // Admins cannot create Super Admin users
  if (role === UserRole.SUPER_ADMIN) {
    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      throw new AppError(
        'Only Super Admins can create Super Admin users',
        403
      );
    }
  }
  
  // Validate department requirement
  if (role === UserRole.DEPARTMENT_USER && !department) {
    throw new AppError(
      'Department is required for Department User role',
      400
    );
  }
  
  const hashedPassword = await hashPassword(password);
  
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    department
  });
  
  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: { user: { id: user._id, name, email, role, department } }
  });
};
```

##### Deleting Department (with validation)
```typescript
export const deleteDepartment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const currentUser = req.user!;
  
  const department = await Department.findById(id);
  if (!department) {
    throw new AppError('Department not found', 404);
  }
  
  // Check for active tickets
  const activeTickets = await Ticket.countDocuments({
    department: department.name,
    status: { $nin: [TicketStatus.CLOSED] }
  });
  
  // Admins cannot delete departments with active tickets
  if (activeTickets > 0 && currentUser.role !== UserRole.SUPER_ADMIN) {
    throw new AppError(
      `Cannot delete department with ${activeTickets} active tickets. ` +
      `Only Super Admin can force delete.`,
      403
    );
  }
  
  await department.deleteOne();
  
  res.json({
    success: true,
    message: 'Department deleted successfully'
  });
};
```

---

### Super Admin Role - Complete Specification

#### Core Characteristics
- **Identifier**: `UserRole.SUPER_ADMIN`
- **Database Field**: `role: 'SUPER_ADMIN'`
- **Default Role**: No
- **Requires Department**: No
- **Can Be Assigned By**: Super Admin only
- **Scope**: Unrestricted

#### Exclusive Permissions

All Admin permissions, plus:

| Category | Exclusive Operations |
|----------|---------------------|
| User Management | Create/delete Super Admin users |
| Department Management | Force delete departments with active tickets |
| System Configuration | Modify JWT secrets, session timeouts, security policies |
| Database Operations | Backup, restore, direct database access |
| API Management | Generate API keys, manage rate limits |
| Security | View security logs, manage authentication failures |
| Integrations | Configure external integrations and webhooks |

#### API Endpoints (Super Admin Exclusive)

```typescript
// All Admin endpoints, plus:

// Super Admin Management
POST   /api/v1/users/super-admin              // Create Super Admin
DELETE /api/v1/users/super-admin/:id          // Delete Super Admin

// System Configuration
GET    /api/v1/system/config                  // View system config
PUT    /api/v1/system/config                  // Update system config
PATCH  /api/v1/system/maintenance             // Toggle maintenance mode

// Database Operations
POST   /api/v1/system/backup                  // Create backup
POST   /api/v1/system/restore                 // Restore from backup

// Security & Logs
GET    /api/v1/system/security-logs           // Security logs
GET    /api/v1/system/failed-logins           // Failed login attempts

// API Management
POST   /api/v1/system/api-keys                // Generate API key
DELETE /api/v1/system/api-keys/:id            // Revoke API key
```

---

## Permission Implementation

### Permission Enum Definition

```typescript
// src/constants/permissions.ts
export enum Permission {
  // Ticket permissions
  CREATE_TICKET = 'CREATE_TICKET',
  VIEW_OWN_TICKETS = 'VIEW_OWN_TICKETS',
  VIEW_DEPARTMENT_TICKETS = 'VIEW_DEPARTMENT_TICKETS',
  VIEW_ALL_TICKETS = 'VIEW_ALL_TICKETS',
  UPDATE_OWN_TICKETS = 'UPDATE_OWN_TICKETS',
  UPDATE_DEPARTMENT_TICKETS = 'UPDATE_DEPARTMENT_TICKETS',
  UPDATE_ALL_TICKETS = 'UPDATE_ALL_TICKETS',
  DELETE_TICKETS = 'DELETE_TICKETS',
  ASSIGN_TICKETS = 'ASSIGN_TICKETS',
  CLOSE_TICKETS = 'CLOSE_TICKETS',
  REOPEN_TICKETS = 'REOPEN_TICKETS',
  EXPORT_TICKETS = 'EXPORT_TICKETS',
  
  // User permissions
  VIEW_OWN_PROFILE = 'VIEW_OWN_PROFILE',
  UPDATE_OWN_PROFILE = 'UPDATE_OWN_PROFILE',
  VIEW_ALL_USERS = 'VIEW_ALL_USERS',
  VIEW_DEPARTMENT_USERS = 'VIEW_DEPARTMENT_USERS',
  CREATE_USERS = 'CREATE_USERS',
  UPDATE_USERS = 'UPDATE_USERS',
  DELETE_USERS = 'DELETE_USERS',
  ASSIGN_ROLES = 'ASSIGN_ROLES',
  RESET_PASSWORDS = 'RESET_PASSWORDS',
  
  // Department permissions
  VIEW_DEPARTMENTS = 'VIEW_DEPARTMENTS',
  VIEW_OWN_DEPARTMENT = 'VIEW_OWN_DEPARTMENT',
  VIEW_ALL_DEPARTMENTS = 'VIEW_ALL_DEPARTMENTS',
  MANAGE_DEPARTMENTS = 'MANAGE_DEPARTMENTS',
  CONFIGURE_SLA = 'CONFIGURE_SLA',
  
  // System permissions
  VIEW_DASHBOARD = 'VIEW_DASHBOARD',
  ACCESS_REPORTS = 'ACCESS_REPORTS',
  VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS',
  SYSTEM_CONFIG = 'SYSTEM_CONFIG',
  DATABASE_OPERATIONS = 'DATABASE_OPERATIONS',
  MANAGE_INTEGRATIONS = 'MANAGE_INTEGRATIONS',
}
```

### Role-Permission Mapping

```typescript
// src/constants/permissions.ts
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.STUDENT]: [
    Permission.CREATE_TICKET,
    Permission.VIEW_OWN_TICKETS,
    Permission.UPDATE_OWN_TICKETS,
    Permission.REOPEN_TICKETS,
    Permission.VIEW_OWN_PROFILE,
    Permission.UPDATE_OWN_PROFILE,
    Permission.VIEW_DEPARTMENTS,
    Permission.VIEW_DASHBOARD,
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
    Permission.VIEW_DASHBOARD,
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
    ...ROLE_PERMISSIONS[UserRole.ADMIN],
    Permission.SYSTEM_CONFIG,
    Permission.DATABASE_OPERATIONS,
    Permission.MANAGE_INTEGRATIONS,
  ],
};
```

### Permission Check Helper

```typescript
// src/utils/permissions.ts
export const hasPermission = (
  userRole: UserRole,
  permission: Permission
): boolean => {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  return rolePermissions.includes(permission);
};

export const hasAnyPermission = (
  userRole: UserRole,
  permissions: Permission[]
): boolean => {
  return permissions.some(permission => hasPermission(userRole, permission));
};

export const hasAllPermissions = (
  userRole: UserRole,
  permissions: Permission[]
): boolean => {
  return permissions.every(permission => hasPermission(userRole, permission));
};
```

---

## Access Control Flow

### Request Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Incoming Request                         │
│              GET /api/v1/tickets/:id                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              1. Authentication Middleware                   │
│  - Extract JWT from Authorization header                    │
│  - Verify token signature                                   │
│  - Decode user data (userId, email, role, department)       │
│  - Attach to req.user                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    Token Valid?
                    ↙         ↘
                 No            Yes
                 ↓              ↓
        ┌──────────────┐   ┌──────────────────────────────┐
        │ Return 401   │   │ 2. Role Check Middleware     │
        │ Unauthorized │   │ - Check user.role            │
        └──────────────┘   │ - Verify against allowed     │
                           │   roles for this route       │
                           └──────────────────────────────┘
                                       ↓
                               Role Allowed?
                               ↙         ↘
                            No            Yes
                            ↓              ↓
                   ┌──────────────┐   ┌──────────────────────────────┐
                   │ Return 403   │   │ 3. Ownership/Scope Check     │
                   │ Forbidden    │   │ - Verify resource ownership  │
                   └──────────────┘   │ - Check department boundary  │
                                      │ - Validate access scope      │
                                      └──────────────────────────────┘
                                                  ↓
                                          Access Granted?
                                          ↙         ↘
                                       No            Yes
                                       ↓              ↓
                              ┌──────────────┐   ┌──────────────────┐
                              │ Return 403   │   │ 4. Controller    │
                              │ Forbidden    │   │ - Execute logic  │
                              └──────────────┘   │ - Return response│
                                                 └──────────────────┘
```

### Middleware Chain Example

```typescript
// Route definition with complete middleware chain
router.get('/tickets/:id',
  authenticate,                    // Step 1: Verify JWT
  requireRole(                     // Step 2: Check role
    UserRole.STUDENT,
    UserRole.DEPARTMENT_USER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN
  ),
  requireTicketAccess(),          // Step 3: Verify access scope
  getTicketById                   // Step 4: Controller
);

// Step 3: Scope verification middleware
const requireTicketAccess = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user!;
    const ticketId = req.params.id;
    
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }
    
    // Student: Can only access own tickets
    if (user.role === UserRole.STUDENT) {
      if (ticket.studentId.toString() !== user.userId) {
        throw new AppError('Access denied', 403);
      }
    }
    
    // Department User: Can only access dept tickets
    if (user.role === UserRole.DEPARTMENT_USER) {
      if (ticket.department !== user.department) {
        throw new AppError('Access denied', 403);
      }
    }
    
    // Admin & Super Admin: Full access (no check needed)
    
    req.ticket = ticket;
    next();
  };
};
```

---

## Use Cases & Scenarios

### Scenario 1: Student Creating and Tracking a Ticket

**User:** John (Student)  
**Goal:** Create a ticket for placement assistance

**Flow:**
1. John logs in → Receives JWT token with role: STUDENT
2. John creates ticket:
   ```
   POST /api/v1/tickets
   Authorization: Bearer <john_token>
   Body: {
     subject: "Need help with resume",
     description: "I need assistance with my resume for placement",
     department: "PLACEMENT",
     priority: "MEDIUM"
   }
   ```
3. System automatically sets `studentId` to John's ID
4. Ticket created with status: OPEN
5. John views his tickets:
   ```
   GET /api/v1/tickets
   Authorization: Bearer <john_token>
   ```
6. System returns only tickets where `studentId === John's ID`

**Access Control:**
- ✅ Can create ticket for himself
- ✅ Can view only his tickets
- ❌ Cannot see other students' tickets
- ❌ Cannot assign ticket to department

---

### Scenario 2: Department User Managing Tickets

**User:** Sarah (Department User - PLACEMENT)  
**Goal:** Manage placement-related tickets

**Flow:**
1. Sarah logs in → JWT with role: DEPARTMENT_USER, department: PLACEMENT
2. Sarah views department tickets:
   ```
   GET /api/v1/tickets/department/PLACEMENT
   Authorization: Bearer <sarah_token>
   ```
3. System returns all PLACEMENT tickets
4. Sarah tries to view FINANCE tickets:
   ```
   GET /api/v1/tickets/department/FINANCE
   Authorization: Bearer <sarah_token>
   ```
5. System returns 403 Forbidden (department mismatch)
6. Sarah assigns a ticket:
   ```
   PATCH /api/v1/tickets/123/assign
   Body: { assignedTo: "placement_user_id" }
   ```
7. System verifies assignee is in PLACEMENT department
8. Ticket assigned successfully

**Access Control:**
- ✅ Can view PLACEMENT tickets
- ✅ Can assign to PLACEMENT users
- ❌ Cannot view FINANCE tickets
- ❌ Cannot assign to FINANCE users
- ❌ Cannot delete tickets

---

### Scenario 3: Admin Managing the System

**User:** Mike (Admin)  
**Goal:** Manage users and tickets across all departments

**Flow:**
1. Mike logs in → JWT with role: ADMIN
2. Mike views all tickets:
   ```
   GET /api/v1/tickets
   Authorization: Bearer <mike_token>
   ```
3. System returns ALL tickets (no department filter)
4. Mike creates a new department user:
   ```
   POST /api/v1/users
   Body: {
     name: "New User",
     email: "newuser@example.com",
     role: "DEPARTMENT_USER",
     department: "OPERATIONS"
   }
   ```
5. User created successfully
6. Mike tries to create Super Admin:
   ```
   POST /api/v1/users
   Body: { role: "SUPER_ADMIN" }
   ```
7. System returns 403 Forbidden (Admins cannot create Super Admins)

**Access Control:**
- ✅ Can view all tickets
- ✅ Can create Department Users and Admins
- ✅ Can delete tickets
- ❌ Cannot create Super Admin users
- ❌ Cannot modify system configuration

---

### Scenario 4: Cross-Department Ticket Reassignment

**Situation:** A ticket was created for PLACEMENT but needs to go to TRAINING

**Actors:**
- John (Student) - Created the ticket
- Sarah (PLACEMENT Department User)
- Mike (Admin)

**Flow:**
1. John creates ticket assigned to PLACEMENT
2. Sarah (PLACEMENT) tries to reassign to TRAINING:
   ```
   PATCH /api/v1/tickets/123/assign
   Body: { department: "TRAINING", assignedTo: "training_user_id" }
   ```
3. System returns 403 Forbidden (Department Users cannot change department)
4. Sarah escalates to Admin
5. Mike (Admin) reassigns ticket:
   ```
   PATCH /api/v1/tickets/123/assign
   Body: { department: "TRAINING", assignedTo: "training_user_id" }
   ```
6. System allows (Admins can reassign across departments)
7. Ticket now belongs to TRAINING department
8. Sarah can no longer see this ticket
9. TRAINING department users can now see and manage it

**Key Points:**
- Department Users are bounded by their department
- Cross-department operations require Admin intervention
- Access automatically adjusts based on department assignment

---

## Summary

### Role Comparison Table

| Aspect | Student | Department User | Admin | Super Admin |
|--------|---------|----------------|-------|-------------|
| **Scope** | Self | Department | System-wide | Unrestricted |
| **Primary Function** | Create tickets | Manage dept tickets | Manage system | Configure system |
| **Ticket Access** | Own only | Dept only | All | All |
| **User Management** | Self only | View dept users | Create/manage users | Full control |
| **Department Access** | View list | Own dept | All depts | All depts |
| **Can Create Users** | ❌ | ❌ | ✅ (limited) | ✅ (all) |
| **Can Delete Tickets** | ❌ | ❌ | ✅ | ✅ |
| **System Config** | ❌ | ❌ | ❌ | ✅ |
| **Database Ops** | ❌ | ❌ | ❌ | ✅ |

### Key Principles

1. **Principle of Least Privilege**: Users have only the minimum permissions needed
2. **Scope Enforcement**: Access is restricted by role scope (self, department, system)
3. **Hierarchical Inheritance**: Higher roles inherit lower role permissions
4. **Explicit Denial**: What's not explicitly allowed is denied
5. **Boundary Protection**: Department boundaries are strictly enforced
6. **Ownership Verification**: Users can only modify resources they own (unless higher role)

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-08  
**Status:** Comprehensive Reference - Ready for Implementation
