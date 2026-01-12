# Initial Project Setup & Initialization Guide

Based on the **Student Ticketing & Department-Based Support System** requirements, the following technical components must be initialized and configured in this early stage:

## 1. Core Framework & Configuration
- [x] **Node.js & Express**: Basic server loop (Completed).
- [x] **TypeScript**: Compiler configuration (`tsconfig.json`) (Completed).
- [x] **Environment Variables**: Expand `.env` to include:
    - `MONGO_URI` ✅
    - `JWT_SECRET` ✅
    - `NODE_ENV` ✅
    - `CLIENT_URL` (for CORS)

## 2. Database Initialization
You need to choose a database (MongoDB recommended for flexibility, or PostgreSQL for relational structure) and set up the connection.
- [x] **Connection Logic**: Create `src/config/db.ts` ✅
- [x] **Schemas / Models**: Initialize the following data models:
    - [x] **User**: properties: `name`, `email`, `password`, `role` (Student, Dept, Admin), `department` (optional). ✅
    - [ ] **Ticket**: properties: `studentId`, `subject`, `description`, `category`, `priority`, `department`, `status`, `assignedTo`, `history` (array).
    - [ ] **Department**: properties: `name`, `slaRules` (timeout settings).

## 3. Constants & Types (The "Truth" Source)
[x] Define standard values to avoid magic strings. Create `src/constants/index.ts`: ✅
- [x] **Roles**: `STUDENT`, `DEPARTMENT_USER`, `ADMIN`, `SUPER_ADMIN`. ✅
- [x] **Departments**: `PLACEMENT`, `OPERATIONS`, `TRAINING`, `FINANCE`. ✅
- [x] **Ticket Status**: `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `WAITING_FOR_STUDENT`, `RESOLVED`, `CLOSED`. ✅
- [x] **Priority**: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`. ✅

## 4. Authentication Module
- **Middleware**: Create `src/middleware/auth.ts` to validate JWTs and populate `req.user`.
- **Utilities**: `src/utils/jwt.ts` (sign/verify tokens) and `src/utils/password.ts` (hash/compare bcrypt).

## 5. Global Error Handling
Initialize a robust error handling mechanism to ensure consistent API responses.
- **Custom Error Class**: `AppError` (statusCode, message).
- **Middleware**: `src/middleware/errorHandler.ts` to catch exceptions and send JSON responses.

## 6. Access Control (RBAC)
- **Middleware**: Create `src/middleware/roleCheck.ts` to restrict routes (e.g., `onlyAdmin`, `onlyDept`).

## 7. Logging
- Set up **Winston** or **Morgan** to log HTTP requests and system errors for auditing.

---

### Recommended Next Step
Start by **setting up the Database Connection** and defining the **User Schema**, as all other features depend on users being able to log in.
