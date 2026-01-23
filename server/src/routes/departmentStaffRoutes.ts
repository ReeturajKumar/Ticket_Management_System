import { Router } from 'express';
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
import { authenticate, requireDepartmentUser } from '../middleware/auth';

const router = Router();

// All routes require authentication and department user role
router.use(authenticate);
router.use(requireDepartmentUser);

// My Tickets Routes
// GET /api/v1/department/staff/my-tickets - List my assigned tickets
router.get('/my-tickets', listMyTickets);

// GET /api/v1/department/staff/my-requests - List my created internal tickets
router.get('/my-requests', listMyInternalRequests);

// GET /api/v1/department/staff/my-tickets/:id - Get my ticket details
router.get('/my-tickets/:id', getMyTicketDetails);

// PATCH /api/v1/department/staff/my-tickets/:id/status - Update my ticket status
router.patch('/my-tickets/:id/status', updateMyTicketStatus);

// POST /api/v1/department/staff/my-tickets/:id/comments - Add comment to my ticket
router.post('/my-tickets/:id/comments', addCommentToMyTicket);

// GET /api/v1/department/staff/unassigned-tickets - View unassigned tickets
router.get('/unassigned-tickets', listUnassignedTickets);

// My Performance Routes
// GET /api/v1/department/staff/my-dashboard - Get my dashboard
router.get('/my-dashboard', getMyDashboard);

// GET /api/v1/department/staff/my-performance - Get my performance history
router.get('/my-performance', getMyPerformance);

// POST /api/v1/department/staff/internal-ticket - Create internal ticket
router.post('/internal-ticket', createInternalTicket);

export default router;
