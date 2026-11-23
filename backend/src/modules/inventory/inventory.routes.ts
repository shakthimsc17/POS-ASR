import { Router } from 'express';
import {
  getStockOverview,
  getLowStockAlerts,
  listStockMovements,
  createStockAdjustment,
} from './inventory.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/overview', getStockOverview);
router.get('/low-stock', getLowStockAlerts);
router.get('/movements', listStockMovements);
router.post('/adjustments', requireRole(['ADMIN']), createStockAdjustment);

export default router;
