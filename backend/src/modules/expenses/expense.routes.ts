import { Router } from 'express';
import {
  listExpenseCategories,
  createExpenseCategory,
  listExpenses,
  createExpense,
} from './expense.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

router.use(authenticate, requireRole(['ADMIN']));

router.get('/categories', listExpenseCategories);
router.post('/categories', createExpenseCategory);

router.get('/', listExpenses);
router.post('/', createExpense);

export default router;
