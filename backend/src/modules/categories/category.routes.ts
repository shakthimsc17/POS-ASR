import { Router } from 'express';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listBrands,
  createBrand,
} from './category.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listCategories);
router.post('/', requireRole(['ADMIN']), createCategory);
router.put('/:id', requireRole(['ADMIN']), updateCategory);
router.delete('/:id', requireRole(['ADMIN']), deleteCategory);

router.get('/brands/all', listBrands);
router.post('/brands', requireRole(['ADMIN']), createBrand);

export default router;
