import { Router } from 'express';
import { createPublicTicket, getPublicConfig } from '../controllers/publicTicketController';
import { publicTicketLimiter } from '../middleware/rateLimiter';
import { upload } from '../utils/fileUpload';
import { validate, createPublicTicketSchema } from '../utils/validation';

const router = Router();
router.post('/tickets', publicTicketLimiter, upload.array('attachments', 5), validate(createPublicTicketSchema), createPublicTicket);
router.get('/config', getPublicConfig);

export default router;
