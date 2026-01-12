import { Router } from 'express';
import {
  listTeamMembers,
  getTeamMemberTickets,
  getTeamMemberPerformance,
} from '../controllers/departmentTeamController';
import { authenticate, requireDepartmentHead } from '../middleware/auth';

const router = Router();

// All routes require authentication and department head privileges
router.use(authenticate);
router.use(requireDepartmentHead);

// GET /api/v1/department/team - List all team members
router.get('/', listTeamMembers);

// GET /api/v1/department/team/:userId/tickets - Get team member's tickets
router.get('/:userId/tickets', getTeamMemberTickets);

// GET /api/v1/department/team/:userId/performance - Get team member performance
router.get('/:userId/performance', getTeamMemberPerformance);

export default router;
