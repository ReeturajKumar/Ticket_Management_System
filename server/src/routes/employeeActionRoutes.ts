import { Router } from 'express';
import { 
  createTicket, 
  listMyTickets, 
  getTicketDetails, 
  addComment, 
  getDashboardStats 
} from '../controllers/employeeActionController';
import { authenticate, requireEmployee } from '../middleware/auth';

const router = Router();

// All employee routes are protected and require the EMPLOYEE role
router.use(authenticate);
router.use(requireEmployee);

// Dashboard
router.get('/dashboard-stats', getDashboardStats);

// Tickets
router.post('/tickets', createTicket);
router.get('/tickets', listMyTickets);
router.get('/tickets/:id', getTicketDetails);
router.post('/tickets/:id/comments', addComment);

export default router;
