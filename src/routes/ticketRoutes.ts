import { Router } from 'express';
import {
  createTicket,
  listTickets,
  getTicket,
  updateTicket,
  addComment,
  reopenTicket,
} from '../controllers/ticketController';
import { authenticate } from '../middleware/auth';
import { verifyTicketOwnership } from '../middleware/ownership';
import { ticketCreationLimiter } from '../middleware/rateLimiter';

const router = Router();

// All ticket routes require authentication
router.use(authenticate);

// POST /api/v1/tickets - Create new ticket (with rate limiting)
router.post('/', ticketCreationLimiter, createTicket);

// GET /api/v1/tickets - List user's own tickets
router.get('/', listTickets);

// GET /api/v1/tickets/:id - Get ticket details (with ownership check)
router.get('/:id', verifyTicketOwnership, getTicket);

// PUT /api/v1/tickets/:id - Update ticket (with ownership check)
router.put('/:id', verifyTicketOwnership, updateTicket);

// POST /api/v1/tickets/:id/comments - Add comment (with ownership check)
router.post('/:id/comments', verifyTicketOwnership, addComment);

// POST /api/v1/tickets/:id/reopen - Reopen ticket (with ownership check)
router.post('/:id/reopen', verifyTicketOwnership, reopenTicket);

export default router;
