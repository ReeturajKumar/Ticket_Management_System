import { Request, Response } from 'express';
import User from '../models/User';
import { hashPassword } from '../utils/security';
import { UserRole } from '../constants';
import AppError, { ErrorCode } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { emitUserCreated } from '../utils/socket';


export const employeeController = {
  createEmployee: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError({
        code: ErrorCode.EMAIL_ALREADY_EXISTS,
        message: 'User with this email already exists',
      }, 409);
    }

    const employee = await User.create({
      name,
      email,
      password: await hashPassword(password),
      role: UserRole.EMPLOYEE,
      isApproved: true,
      approvalStatus: 'APPROVED'
    });

    // Emit real-time update for dashboard stats
    emitUserCreated(employee);

    res.status(201).json({
      success: true,
      message: 'Internal Employee created successfully',
      data: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        isApproved: employee.isApproved
      }
    });
  }),


  getAllEmployees: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const employees = await User.find({ role: UserRole.EMPLOYEE }).select('-password');

    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees
    });
  })
};
