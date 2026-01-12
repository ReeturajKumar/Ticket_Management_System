import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Test Protected Route
 * GET /api/v1/test/protected
 * Requires authentication
 */
router.get('/protected', authenticate, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'You are authenticated!',
    user: req.user,
  });
});

/**
 * Test Public Route
 * GET /api/v1/test/public
 * No authentication required
 */
router.get('/public', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'This is a public route - no authentication needed',
  });
});

export default router;
