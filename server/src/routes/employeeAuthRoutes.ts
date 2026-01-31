import { Router } from 'express';
import { employeeAuthController } from '../controllers/employeeAuthController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Routes for Internal Employee Authentication
 * Base path: /api/v1/employee-auth
 */

// Login - No auth required
router.post('/login', employeeAuthController.login);

// Register - No auth required
router.post('/register', employeeAuthController.register);

// Refresh Token - Tokens sent in body
router.post('/refresh', employeeAuthController.refresh);

// Logout - Requires active session
router.post('/logout', authenticate, employeeAuthController.logout);

export default router;
