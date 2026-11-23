import { Router } from 'express';
import {
  listSuppliers,
  createSupplier,
  listPurchases,
  createPurchaseEntry,
} from './purchase.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Suppliers
router.get('/suppliers', listSuppliers);
router.post('/suppliers', requireRole(['ADMIN']), createSupplier);

// Purchases
router.get('/', requireRole(['ADMIN']), listPurchases);
router.post('/', requireRole(['ADMIN']), createPurchaseEntry);

export default router;
