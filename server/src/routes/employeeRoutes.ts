import { Router } from 'express';
import { employeeController } from '../controllers/employeeController';

const router = Router();

/**
 * Routes for Internal Employees
 * Base path: /api/v1/employees
 */

// Create a new employee
router.post('/create', employeeController.createEmployee);

// Get all employees
router.get('/', employeeController.getAllEmployees);

export default router;
