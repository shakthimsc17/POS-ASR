import { Router } from 'express';
import {
  checkoutCart,
  listOrders,
  getOrderById,
  processSalesReturn,
  cancelOrder,
} from './sales.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Quick POS checkout
router.post('/checkout', checkoutCart);

// Order history & single order
router.get('/orders', listOrders);
router.get('/orders/:id', getOrderById);

// Returns & cancellations
router.post('/orders/:orderId/returns', processSalesReturn);
router.post('/orders/:id/cancel', requireRole(['ADMIN']), cancelOrder);

export default router;
