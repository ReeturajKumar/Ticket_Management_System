import { Request, Response } from 'express';
import User from '../models/User';
import { hashPassword } from '../utils/password';
import { UserRole } from '../constants';
import AppError, { ErrorCode } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Controller for managing basic internal employees
 */
export const employeeController = {
  /**
   * Create a new Internal Employee
   * POST /api/v1/employees/create
   * 
   * This is a dedicated endpoint for creating the new "EMPLOYEE" role
   */
  createEmployee: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { name, email, password } = req.body;

    // 1. Basic Validation
    if (!name || !email || !password) {
      throw new AppError({
        code: ErrorCode.MISSING_REQUIRED_FIELD,
        message: 'Name, email, and password are required',
      }, 400);
    }

    // 2. Check Expiry/Duplication
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError({
        code: ErrorCode.EMAIL_ALREADY_EXISTS,
        message: 'User with this email already exists',
      }, 409);
    }

    // 3. Hash Password
    const hashedPassword = await hashPassword(password);

    // 4. Create Employee User
    // Internal employees don't have a department and are automatically verified & approved for easy testing
    const employee = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: UserRole.EMPLOYEE,
      isVerified: true,  // Auto-verified for immediate testing
      isApproved: true,  // Auto-approved
      approvalStatus: 'APPROVED'
    });

    res.status(201).json({
      success: true,
      message: 'Internal Employee created successfully',
      data: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        isVerified: employee.isVerified,
        isApproved: employee.isApproved
      }
    });
  }),

  /**
   * Get all Employees
   * GET /api/v1/employees
   */
  getAllEmployees: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const employees = await User.find({ role: UserRole.EMPLOYEE })
      .select('-password -sessions -verificationOTP');

    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees
    });
  })
};
