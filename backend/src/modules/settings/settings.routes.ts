import { Router } from 'express';
import { getStoreSettings, updateStoreSettings, resetDatabase } from './settings.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getStoreSettings);
router.put('/', requireRole(['ADMIN']), updateStoreSettings);
router.post('/reset-database', requireRole(['ADMIN']), resetDatabase);

export default router;
