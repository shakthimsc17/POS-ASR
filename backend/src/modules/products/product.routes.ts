import { Router } from 'express';
import {
  listProducts,
  getProductById,
  createProductWithVariants,
  updateProduct,
  getVariantByBarcode,
  searchProductsQuick,
  downloadSampleCsv,
  importProductsCsv,
} from './product.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Quick search and barcode lookup used in POS billing
router.get('/sample-csv', downloadSampleCsv);
router.post('/import-csv', requireRole(['ADMIN']), importProductsCsv);
router.get('/variant/barcode/:barcode', getVariantByBarcode);
router.get('/search/quick', searchProductsQuick);

// Product master list and details
router.get('/', listProducts);
router.get('/:id', getProductById);

// Product and variant creation/updates (Admin only)
router.post('/', requireRole(['ADMIN']), createProductWithVariants);
router.put('/:id', requireRole(['ADMIN']), updateProduct);

export default router;
