import { Router } from 'express';
import {
  getDashboardSummary,
  getSalesReport,
  getProfitLossReport,
  getBestSellingProducts,
} from './report.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Salesperson and Admin can view dashboard KPIs
router.get('/dashboard', getDashboardSummary);

// Sales reports
router.get('/sales', getSalesReport);
router.get('/best-sellers', getBestSellingProducts);

// Admin-only financial statement (Gross profit, COGS, Net operating profit)
router.get('/profit-loss', requireRole(['ADMIN']), getProfitLossReport);

export default router;
