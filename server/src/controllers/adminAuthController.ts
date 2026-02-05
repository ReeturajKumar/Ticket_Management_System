import { Request, Response } from 'express';
import User from '../models/User';
import { AuthService } from '../services/authService';
import { AuthValidation } from '../middleware/authValidation';
import { ResponseUtils } from '../utils/responses';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Login Admin User
 */
export const loginAdminUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  AuthValidation.validateUserExists(user);
  AuthValidation.validateAdminStatus(user);

  const tokenData = await AuthService.performLogin(user, password, false, req);

  res.status(200).json(ResponseUtils.authSuccess(user, tokenData));
});
