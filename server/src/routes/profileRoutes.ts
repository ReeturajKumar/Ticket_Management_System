import { Router } from 'express';
import { getProfile, updateProfile, changePassword } from '../controllers/profileController';
import { authenticate } from '../middleware/auth';
import { profileLimiter } from '../middleware/rateLimiter';

const router = Router();

// All profile routes require authentication
router.use(authenticate);

// Apply rate limiter to all profile routes
router.use(profileLimiter);

// GET /api/v1/profile - Get authenticated user's profile
router.get('/', getProfile);

// PUT /api/v1/profile - Update authenticated user's profile
router.put('/', updateProfile);

// PATCH /api/v1/profile/password - Change password
router.patch('/password', changePassword);

export default router;
