import { Router } from 'express';
import { createPublicTicket, getPublicConfig } from '../controllers/publicTicketController';
import { publicTicketLimiter } from '../middleware/rateLimiter';

const router = Router();

// POST /api/v1/public/tickets - Create public ticket (no auth required)
router.post('/tickets', publicTicketLimiter, createPublicTicket);

// GET /api/v1/public/config - Get dynamic configuration (departments, etc.)
router.get('/config', getPublicConfig);

export default router;
