import { Request, Response } from 'express';
import { Department } from '../constants';

/**
 * Get all departments
 * GET /api/v1/departments
 */
export const getDepartments = async (req: Request, res: Response): Promise<void> => {
  try {
    // Department information with descriptions
    const departmentInfo = [
      {
        id: Department.PLACEMENT,
        name: 'Placement & Career Services',
        description: 'Job placements, internships, resume building, interview preparation',
        icon: '💼',
        isActive: true,
      },
      {
        id: Department.OPERATIONS,
        name: 'Operations & Facilities',
        description: 'Campus facilities, infrastructure, maintenance, general operations',
        icon: '🏢',
        isActive: true,
      },
      {
        id: Department.TRAINING,
        name: 'Training & Development',
        description: 'Workshops, courses, skill development, certifications',
        icon: '📚',
        isActive: true,
      },
      {
        id: Department.FINANCE,
        name: 'Finance & Accounts',
        description: 'Fees, scholarships, refunds, financial queries',
        icon: '💰',
        isActive: true,
      },
    ];

    res.status(200).json({
      success: true,
      data: {
        departments: departmentInfo,
        total: departmentInfo.length,
      },
    });
  } catch (error: any) {
    throw error;
  }
};
