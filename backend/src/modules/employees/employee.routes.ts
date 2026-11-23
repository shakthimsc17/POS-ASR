import { Router } from 'express';
import {
  listEmployees,
  createEmployee,
  updateEmployee,
  resetPassword,
} from './employee.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

// Only ADMIN can manage employees
router.use(authenticate, requireRole(['ADMIN']));

router.get('/', listEmployees);
router.post('/', createEmployee);
router.put('/:id', updateEmployee);
router.patch('/:id/reset-password', resetPassword);

export default router;
