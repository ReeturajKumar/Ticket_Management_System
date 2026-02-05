import { Router } from 'express';
import {
  registerDepartmentUser,
  loginDepartmentUser,
  getRegistrationStatus,
} from '../controllers/departmentAuthController';
import {
  getDashboardOverview,
  getTeamPerformance,
  getAnalytics,
} from '../controllers/departmentDashboardController';
import {
  getSummaryReport,
  exportReport,
} from '../controllers/departmentReportsController';
import {
  listMyTickets,
  getMyTicketDetails,
  updateMyTicketStatus,
  addCommentToMyTicket,
  listUnassignedTickets,
  getMyDashboard,
  getMyPerformance,
  createInternalTicket,
  listMyInternalRequests,
} from '../controllers/departmentStaffController';
import {
  listTeamMembers,
  getTeamMemberTickets,
  getTeamMemberPerformance,
} from '../controllers/departmentTeamController';
import {
  listDepartmentTickets,
  getTicketDetails,
  assignTicket,
  updateTicketStatus,
  addInternalNote,
  changeTicketPriority,
  searchTickets,
} from '../controllers/departmentTicketController';
import { getDepartments } from '../controllers/departmentController';
import { bulkAssignTickets, bulkUpdateStatus } from '../controllers/bulkOperationsController';
import { authenticate, requireDepartmentHead, requireDepartmentUser } from '../middleware/auth';
import { loginLimiter, authLimiter } from '../middleware/rateLimiter';
import { 
  validate, 
  registerSchema, 
  loginSchema, 
  reportSchema, 
  updateStatusSchema, 
  assignTicketSchema,
  changePrioritySchema,
  commentSchema, 
  bulkAssignSchema, 
  bulkStatusSchema,
  createInternalTicketSchema
} from '../utils/validation';

const deptAuthRouter = Router();
deptAuthRouter.post('/register', authLimiter, validate(registerSchema), registerDepartmentUser);
deptAuthRouter.post('/login', loginLimiter, validate(loginSchema), loginDepartmentUser);
deptAuthRouter.get('/status', getRegistrationStatus);

const deptDashboardRouter = Router();
deptDashboardRouter.use(authenticate, requireDepartmentHead);
deptDashboardRouter.get('/overview', getDashboardOverview);
deptDashboardRouter.get('/team-performance', getTeamPerformance);
deptDashboardRouter.get('/analytics', getAnalytics);

const deptReportsRouter = Router();
deptReportsRouter.use(authenticate, requireDepartmentHead);
deptReportsRouter.get('/summary', getSummaryReport);
deptReportsRouter.get('/export', validate(reportSchema), exportReport);

const deptStaffRouter = Router();
deptStaffRouter.use(authenticate, requireDepartmentUser);
deptStaffRouter.get('/my-tickets', listMyTickets);
deptStaffRouter.get('/my-requests', listMyInternalRequests);
deptStaffRouter.get('/my-tickets/:id', getMyTicketDetails);
deptStaffRouter.patch('/my-tickets/:id/status', validate(updateStatusSchema), updateMyTicketStatus);
deptStaffRouter.post('/my-tickets/:id/comments', validate(commentSchema), addCommentToMyTicket);
deptStaffRouter.get('/unassigned-tickets', listUnassignedTickets);
deptStaffRouter.get('/my-dashboard', getMyDashboard);
deptStaffRouter.get('/my-performance', getMyPerformance);
deptStaffRouter.post('/internal-ticket', validate(createInternalTicketSchema), createInternalTicket);

const deptTeamRouter = Router();
deptTeamRouter.use(authenticate, requireDepartmentHead);
deptTeamRouter.get('/', listTeamMembers);
deptTeamRouter.get('/:userId/tickets', getTeamMemberTickets);
deptTeamRouter.get('/:userId/performance', getTeamMemberPerformance);

const deptTicketRouter = Router();
deptTicketRouter.use(authenticate, requireDepartmentHead);
deptTicketRouter.post('/bulk-assign', validate(bulkAssignSchema), bulkAssignTickets);
deptTicketRouter.post('/bulk-status', validate(bulkStatusSchema), bulkUpdateStatus);
deptTicketRouter.get('/search', searchTickets);
deptTicketRouter.get('/', listDepartmentTickets);
deptTicketRouter.get('/:id', getTicketDetails);
deptTicketRouter.patch('/:id/assign', validate(assignTicketSchema), assignTicket);
deptTicketRouter.patch('/:id/status', validate(updateStatusSchema), updateTicketStatus);
deptTicketRouter.post('/:id/notes', validate(commentSchema), addInternalNote);
deptTicketRouter.patch('/:id/priority', validate(changePrioritySchema), changeTicketPriority);

const baseDeptRouter = Router();
baseDeptRouter.get('/', authenticate, getDepartments);

export {
  deptAuthRouter,
  deptDashboardRouter,
  deptReportsRouter,
  deptStaffRouter,
  deptTeamRouter,
  deptTicketRouter,
  baseDeptRouter
};
