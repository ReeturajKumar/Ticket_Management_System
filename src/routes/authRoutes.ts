import { Router } from 'express';
import { register, login, refreshToken, logout } from '../controllers/authController';

const router = Router();

// POST /api/v1/auth/register - Register new user
router.post('/register', register);

// POST /api/v1/auth/login - Login user
router.post('/login', login);

// POST /api/v1/auth/refresh - Refresh access token
router.post('/refresh', refreshToken);

// POST /api/v1/auth/logout - Logout user
router.post('/logout', logout);

export default router;
