# Client Folder Analysis - Student Ticketing System

## Overview

This is a comprehensive analysis of the Student Ticketing System client application, a full-featured React + TypeScript web application for managing support tickets in an educational institution.

---

## Project Architecture

### Technology Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | React | 19.2.0 |
| Language | TypeScript | ~5.9.3 |
| Build Tool | Vite | ^7.2.4 |
| Routing | React Router DOM | ^7.12.0 |
| Styling | Tailwind CSS | ^4.1.18 |
| UI Components | Radix UI | Various |
| Forms | React Hook Form + Zod | ^7.71.0 / ^4.3.5 |
| HTTP Client | Axios | ^1.13.2 |
| Charts | Recharts | ^3.6.0 |
| Notifications | React Toastify | ^11.0.5 |

### Build Configuration

**Vite Configuration (`vite.config.ts`)**
- Uses SWC plugin for fast refresh
- Tailwind CSS integrated via plugin
- Path alias: `@` → `./src`

**Environment Variables (`.env`)**
```
VITE_API_URL=http://localhost:5000/api/v1
VITE_APP_NAME=Student Ticketing System
```

---

## Folder Structure

```
client/
├── public/               # Static assets
├── src/
│   ├── assets/          # Images and media
│   │   └── images/      # Signup illustrations, etc.
│   ├── components/      # Reusable React components
│   │   ├── auth/        # Authentication components
│   │   ├── department/  # Department-specific components
│   │   ├── layout/      # Layout wrappers
│   │   ├── tickets/     # Ticket-related components
│   │   └── ui/          # Base UI components (17 components)
│   ├── lib/             # Utility functions and helpers
│   │   ├── validations/ # Zod schemas
│   │   ├── auth.ts      # Auth helper functions
│   │   ├── tokenRefresh.ts # Token refresh logic
│   │   └── utils.ts     # Common utilities (cn function)
│   ├── pages/           # Route pages
│   │   ├── auth/        # Student auth pages
│   │   ├── department/  # Department pages (11 sub-pages)
│   │   ├── home/        # Student dashboard
│   │   ├── profile/     # Profile management
│   │   └── tickets/     # Ticket management pages
│   ├── services/        # API service layer (8 services)
│   ├── App.tsx          # Main routing configuration
│   ├── main.tsx         # React entry point
│   └── index.css        # Global styles and theme
├── dist/                # Build output
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
└── vite.config.ts       # Vite config
```

---

## Component Architecture

### Layout Components

#### Student Layout
- Located in `components/layout/StudentLayout.tsx`
- **StudentHeader**: Top navigation bar
- **StudentSidebar**: Side navigation menu
- Wraps all student-facing pages

#### Department Layout
- Located in `components/layout/DepartmentLayout.tsx`
- **DepartmentHeader**: Department-specific navigation
- **DepartmentSidebar**: Department navigation menu
- Wraps all department staff pages

### UI Components (Shadcn/UI Style)

17 base UI components in `components/ui/`:

| Component | Purpose |
|-----------|---------|
| `alert.tsx` | Alert notifications |
| `avatar.tsx` | User profile pictures |
| `badge.tsx` | Status badges |
| `button.tsx` | Interactive buttons |
| `card.tsx` | Content containers |
| `checkbox.tsx` | Form checkboxes |
| `dialog.tsx` | Modal dialogs |
| `dropdown-menu.tsx` | Dropdown menus |
| `form.tsx` | Form wrapper with validation |
| `input.tsx` | Text inputs |
| `label.tsx` | Form labels |
| `progress.tsx` | Progress bars |
| `select.tsx` | Select dropdowns |
| `separator.tsx` | Visual dividers |
| `table.tsx` | Data tables |
| `tabs.tsx` | Tab navigation |
| `textarea.tsx` | Multi-line text inputs |

### Feature Components

#### Authentication Components
- **LoginForm**: Student login
- **RegistrationForm**: Student signup
- **OTPVerificationModal**: OTP verification
- **FormHeader**: Auth page headers
- **LoginHeader**: Login page header
- **SignUpIllustration**: Signup page visual

#### Department Components
- **AssignTicketDialog**: Assign tickets to staff
- **BulkActionsToolbar**: Bulk operations UI
- **BulkAssignDialog**: Bulk assignment
- **BulkCloseDialog**: Bulk ticket closure
- **TicketQuickActions**: Quick action buttons

#### Ticket Components
- **RateTicketDialog**: Ticket rating form

### Protected Routes

Two route protection mechanisms:

1. **ProtectedRoute** (`components/ProtectedRoute.tsx`)
   - Guards student routes
   - Checks `allowedRoles: ['STUDENT']`
   - Redirects to `/login` if unauthorized

2. **DepartmentProtectedRoute** (`components/DepartmentProtectedRoute.tsx`)
   - Guards department staff routes
   - Checks authentication for department users
   - Redirects to `/department/login` if unauthorized

---

## Routing Structure

Main routing defined in `App.tsx`:

### Student Routes

| Route | Component | Auth Required | Description |
|-------|-----------|---------------|-------------|
| `/login` | LoginPage | No | Student login |
| `/signup` | SignUpPage | No | Student registration |
| `/forgot-password` | ForgotPassword | No | Password recovery |
| `/reset-password` | ResetPassword | No | Password reset |
| `/home` | HomePage | Yes (STUDENT) | Student dashboard |
| `/tickets` | TicketListPage | Yes (STUDENT) | View all tickets |
| `/tickets/new` | CreateTicketPage | Yes (STUDENT) | Create new ticket |
| `/tickets/:id` | TicketDetailsPage | Yes (STUDENT) | Ticket details & chat |
| `/profile` | ProfilePage | Yes (STUDENT) | Student profile |

### Department Routes

| Route | Component | Auth Required | Description |
|-------|-----------|---------------|-------------|
| `/department/login` | DepartmentLoginPage | No | Department login |
| `/department/register` | DepartmentRegisterPage | No | Staff registration |
| `/department/verify-otp` | DepartmentVerifyOTP | No | OTP verification |
| `/department/forgot-password` | DepartmentForgotPassword | No | Password recovery |
| `/department/reset-password` | DepartmentResetPassword | No | Password reset |
| `/department/dashboard` | DepartmentDashboard | Yes | Department analytics |
| `/department/profile` | DepartmentProfilePage | Yes | Staff profile |
| `/department/tickets` | DepartmentTicketsPage | Yes | All department tickets |
| `/department/tickets/unassigned` | DepartmentTicketsPage | Yes | Unassigned tickets |
| `/department/tickets/:id` | DepartmentTicketDetailsPage | Yes | Ticket management |
| `/department/team/:userId` | TeamMemberDetailPage | Yes | Team member details |
| `/department/reports` | DepartmentReportsPage | Yes | Reports & analytics |

**Default Behavior**: All unmatched routes redirect to `/login`

---

## Service Layer Architecture

8 API service files in `src/services/`:

### 1. authService.ts - Student Authentication

- `registerUser()` - Register new student
- `verifyOTP()` - Verify email OTP
- `resendOTP()` - Resend OTP
- `loginUser()` - Student login
- `logoutUser()` - User logout
- `forgotPassword()` - Request password reset
- `resetPassword()` - Reset password with token
- `storeAuthTokens()` - Save tokens to localStorage

### 2. ticketService.ts - Ticket Management

- `createTicket()` - Create new ticket
- `getMyTickets()` - Fetch user's tickets
- `getTicketById()` - Get single ticket details
- `addComment()` - Add comment to ticket
- `reopenTicket()` - Reopen closed ticket
- `updateTicket()` - Update ticket details
- `uploadAttachment()` - Upload file to ticket
- `rateTicket()` - Rate resolved ticket

**Interfaces:**
- `Ticket` - Basic ticket data
- `TicketDetails` - Extended with comments, rating, attachments
- `CreateTicketData` - Ticket creation payload

### 3. departmentAuthService.ts - Department Authentication

Handles authentication for department staff (similar to authService but separate)

### 4. departmentAxios.ts - Axios Instance

Custom axios instance with token refresh interceptors for department routes

### 5. dashboardService.ts - Dashboard Data

Fetch analytics and statistics for dashboards

### 6. departmentHeadService.ts - Department Head Operations

Department head specific API calls (likely team management, advanced analytics)

### 7. departmentStaffService.ts - Staff Operations

Staff member specific operations

### 8. profileService.ts - Profile Management

User profile CRUD operations

### Authentication Pattern

- **Token Storage**: localStorage (`accessToken`, `refreshToken`, `user`)
- **Token Refresh**: `lib/tokenRefresh.ts` provides `fetchWithAuth()` wrapper
- Automatically refreshes tokens on 401 responses
- Seamless reauthentication flow

---

## Styling & Theming

### Tailwind CSS v4 Configuration

Global styles in `index.css`:

#### Theme System
- **Light & Dark Mode**: CSS variables with `.dark` class
- **Color System**: Uses OKLCH color space for better perceptual uniformity
- **Primary Color**: #3b82f6 (blue)
- **Radius System**: 9 radius variants from `--radius-sm` to `--radius-4xl`

#### Key CSS Variables

**Light Mode:**
- Background: `oklch(1 0 0)` (white)
- Foreground: `oklch(0.145 0 0)` (near black)
- Cards: White with borders

**Dark Mode:**
- Background: `oklch(0.145 0 0)` (dark gray)
- Foreground: `oklch(0.985 0 0)` (near white)
- Cards: Dark with subtle borders

#### Chart Colors

5 chart color variables for data visualization:
- `--chart-1` through `--chart-5`
- Used with Recharts components

### Custom Utilities

- Animation delays: `.delay-700`, `.delay-1000` for staggered animations
- Custom variant: `@custom-variant dark (&:is(.dark *))`

### React Toastify Customization

Completely custom-styled toast notifications:
- White background with borders
- Custom shadows and border radius
- Color-coded progress bars (green for success, red for error)
- Refined close button styling

### Design System Utilities

`lib/utils.ts`:
```typescript
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```
Used throughout for conditional className merging.

---

## Authentication & Authorization

### Authentication Flow

#### Student Registration:
1. User submits registration form
2. Backend sends OTP to email
3. User verifies OTP
4. Account activated, tokens issued

#### Student Login:
1. Email + password authentication
2. Receives `accessToken` + `refreshToken`
3. Stored in localStorage

#### Department Staff:
- Similar flow but separate endpoints
- Uses department-specific axios instance

### Authorization Levels

| Role | Access |
|------|--------|
| STUDENT | Student routes only (`/home`, `/tickets`, `/profile`) |
| DEPARTMENT_STAFF | Department routes (`/department/*`) |
| DEPARTMENT_HEAD | Full department access + team management |

### Security Features

- **Route Guards**: ProtectedRoute components check authentication
- **Token Refresh**: Automatic token renewal on expiry
- **Role-Based Access**: Server-side role validation
- **Logout Cleanup**: Complete localStorage cleanup on logout

---

## Key Pages & Features

### Student Dashboard (`pages/home/index.tsx`)

- Ticket statistics (744 lines)
- Recent ticket list
- Bar charts for ticket trends
- Pie charts for status distribution
- Quick actions (create ticket, view all tickets)

### Department Dashboard (`pages/department/dashboard/index.tsx`)

- Comprehensive analytics (1396 lines)
- Team performance metrics
- Ticket statistics by status/priority
- Export functionality
- Charts: Bar, Pie, and custom visualizations
- Staff workload distribution

### Ticket Management

- **Create Ticket**: Form with department selection, priority, description
- **Ticket List**: Table view with filtering and sorting
- **Ticket Details**:
  - Comment system
  - Attachment upload
  - Status tracking
  - Reopen functionality
  - Rating system (for resolved tickets)

### Profile Pages

- Student profile management
- Department staff profile
- Team member details (for department heads)

---

## Dependencies Breakdown

### Core Dependencies (42 packages)

**Drag & Drop:**
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` - Drag and drop functionality

**Form Management:**
- `react-hook-form` - Form state management
- `@hookform/resolvers` - Validation resolvers
- `zod` - Schema validation

**UI Framework:**
- 10 Radix UI packages - Accessible component primitives
- `lucide-react` - Icon library
- `next-themes` - Theme switching

**Data Visualization:**
- `recharts` - Chart library

**HTTP & API:**
- `axios` - HTTP client

**Utilities:**
- `date-fns` - Date manipulation
- `class-variance-authority` - Component variants
- `clsx` + `tailwind-merge` - ClassName utilities

### Dev Dependencies (12 packages)

- ESLint + TypeScript ESLint
- Vite + React SWC plugin
- TypeScript types for React & Node
- `tw-animate-css` - Animation utilities

---

## Development Workflow

### Available Scripts

From `package.json`:
```json
{
  "dev": "vite",              // Start dev server
  "build": "tsc -b && vite build",  // Build for production
  "lint": "eslint .",         // Run linter
  "preview": "vite preview"   // Preview production build
}
```

### Current Dev Server Status

Per user metadata:
- **Client**: Running on `npm run dev` (9+ minutes uptime)
- **Server**: Running on `npm run dev` (1+ minutes uptime)

### Build Process

1. TypeScript compilation (`tsc -b`)
2. Vite production build
3. Output to `dist/` directory
4. Configured for Vercel deployment (`vercel.json`)

### Code Quality

- **Linting**: ESLint with React hooks and refresh plugins
- **Type Safety**: Strict TypeScript configuration
- **Path Aliases**: `@/` for clean imports

---

## Workflow Files

> **NOTE**: No `.agent/workflows/` directory found in the project root. This means there are no custom workflow definitions for automation or deployment processes yet.

### Potential Workflow Opportunities

To improve developer experience, you could create workflows for:

1. **Development Startup** - Start both client and server concurrently
2. **Database Seeding** - Populate test data
3. **Deployment** - Build and deploy to Vercel/other platforms
4. **Testing** - Run tests (once test suite is added)
5. **Code Quality** - Run linting + type checking together

Example workflow structure (if created at `c:\Users\reetu\Desktop\Student\.agent\workflows\dev.md`):

```markdown
---
description: Start development environment
---
1. Navigate to server directory and start the backend
2. Navigate to client directory and start the frontend
3. Verify both servers are running
```

---

## Application Features Summary

### Student Features

✅ Register with email verification (OTP)  
✅ Login/Logout with JWT tokens  
✅ Create support tickets (department-specific)  
✅ View all personal tickets  
✅ Add comments to tickets  
✅ Upload attachments  
✅ Reopen closed tickets  
✅ Rate resolved tickets  
✅ Dashboard with analytics  
✅ Profile management  
✅ Password reset flow  

### Department Staff Features

✅ Register and verify account  
✅ Department-specific dashboard  
✅ View all department tickets  
✅ Assign tickets to team members  
✅ Bulk ticket operations (assign, close)  
✅ Quick actions on tickets  
✅ Team member management  
✅ Performance reports  
✅ Export functionality  
✅ Advanced analytics with charts  

### Technical Features

✅ Responsive design (mobile-friendly)  
✅ Dark/Light mode theming  
✅ Toast notifications  
✅ Loading states  
✅ Error handling  
✅ Automatic token refresh  
✅ Role-based access control  
✅ Form validation with Zod  
✅ Modern UI with Radix components  
✅ Chart visualizations  

---

## Architecture Highlights

### Strengths

#### Clear Separation of Concerns
- Services layer abstracts API calls
- Components are well-organized by feature
- Layouts provide consistent structure

#### Modern Tech Stack
- Latest React 19
- Vite for fast development
- TypeScript for type safety
- Tailwind CSS v4 for styling

#### Robust Authentication
- JWT with refresh tokens
- Automatic token renewal
- Separate flows for student/department

#### Scalable UI Components
- Composable Radix UI primitives
- Consistent design tokens
- Reusable utility functions

#### Developer Experience
- Path aliases for clean imports
- Fast refresh with SWC
- TypeScript autocomplete
- Vite's instant HMR

### Areas for Enhancement

#### Testing
- No test files found (no `.test.tsx` or `.spec.tsx`)
- Could add Jest/Vitest + React Testing Library

#### State Management
- Currently uses localStorage + component state
- Could benefit from Context API or Zustand for complex state

#### API Layer
- Mix of `fetch` and axios
- Could standardize on one approach

#### Error Boundaries
- No React error boundaries detected
- Could improve error handling UX

#### Performance Optimization
- Could add code splitting with `React.lazy()`
- Image optimization
- Bundle size analysis

---

## Conclusion

This is a well-structured, modern React application with:

- Clear architecture (services → components → pages)
- Strong typing with TypeScript
- Modern tooling (Vite, React 19, Tailwind v4)
- Comprehensive features for both students and department staff
- Production-ready authentication with JWT
- Rich UI with charts, forms, and notifications

The codebase follows React best practices and is organized for maintainability and scalability. The dual-role system (student + department) is cleanly separated with dedicated routes, components, and services.

No workflow automation is currently in place (`.agent/workflows` doesn't exist), but the development setup is straightforward with standard npm scripts.