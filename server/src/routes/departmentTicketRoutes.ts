import { Router } from 'express';
import {
  listDepartmentTickets,
  getTicketDetails,
  assignTicket,
  updateTicketStatus,
  addInternalNote,
  changeTicketPriority,
  searchTickets,
} from '../controllers/departmentTicketController';
import { bulkAssignTickets, bulkUpdateStatus } from '../controllers/bulkOperationsController';
import { authenticate, requireDepartmentHead } from '../middleware/auth';

const router = Router();

// All routes require authentication and department head privileges
router.use(authenticate);
router.use(requireDepartmentHead);

// Bulk operations
// POST /api/v1/department/tickets/bulk-assign - Bulk assign tickets
router.post('/bulk-assign', bulkAssignTickets);

// POST /api/v1/department/tickets/bulk-status - Bulk update status
router.post('/bulk-status', bulkUpdateStatus);

// GET /api/v1/department/tickets/search - Search tickets (must be before /:id)
router.get('/search', searchTickets);

// GET /api/v1/department/tickets - List all department tickets
// Supports filters: status, priority, assignedTo, startDate, endDate, resolvedStartDate, resolvedEndDate
router.get('/', listDepartmentTickets);

// GET /api/v1/department/tickets/:id - Get ticket details
router.get('/:id', getTicketDetails);

// PATCH /api/v1/department/tickets/:id/assign - Assign ticket to team member
router.patch('/:id/assign', assignTicket);

// PATCH /api/v1/department/tickets/:id/status - Update ticket status
router.patch('/:id/status', updateTicketStatus);

// POST /api/v1/department/tickets/:id/notes - Add internal note
router.post('/:id/notes', addInternalNote);

// PATCH /api/v1/department/tickets/:id/priority - Change ticket priority
router.patch('/:id/priority', changeTicketPriority);

export default router;
