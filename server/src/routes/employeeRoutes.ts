import { Router } from 'express';
import { employeeAuthController } from '../controllers/employeeAuthController';
import { employeeController } from '../controllers/employeeController';
import { 
  createTicket, 
  listMyTickets, 
  getTicketDetails, 
  addComment, 
  getDashboardStats,
  getWeeklyStats,
  getMonthlyStats,
  deleteTicket 
} from '../controllers/employeeActionController';
import { authenticate, requireEmployee } from '../middleware/auth';
import { loginLimiter, authLimiter } from '../middleware/rateLimiter';
import { upload } from '../utils/fileUpload';
import { 
  validate, 
  registerSchema, 
  loginSchema, 
  createTicketSchema, 
  commentSchema,
  nameEmailPasswordSchema
} from '../utils/validation';

const authRouter = Router();
authRouter.post('/login', loginLimiter, validate(loginSchema), employeeAuthController.login);
authRouter.post('/register', authLimiter, validate(nameEmailPasswordSchema), employeeAuthController.register);

const managementRouter = Router();
managementRouter.post('/create', validate(nameEmailPasswordSchema), employeeController.createEmployee);
managementRouter.get('/', employeeController.getAllEmployees);

const actionRouter = Router();
actionRouter.use(authenticate, requireEmployee);
actionRouter.get('/dashboard-stats', getDashboardStats);
actionRouter.get('/dashboard-stats/weekly', getWeeklyStats);
actionRouter.get('/dashboard-stats/monthly', getMonthlyStats);
actionRouter.post('/tickets', upload.array('attachments', 5), validate(createTicketSchema), createTicket);
actionRouter.get('/tickets', listMyTickets);
actionRouter.get('/tickets/:id', getTicketDetails);
actionRouter.delete('/tickets/:id', deleteTicket);
actionRouter.post('/tickets/:id/comments', upload.array('attachments', 5), validate(commentSchema), addComment);

export { authRouter, managementRouter, actionRouter };
