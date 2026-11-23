import { Router } from 'express';
import { getStoreSettings, updateStoreSettings } from './settings.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getStoreSettings);
router.put('/', requireRole(['ADMIN']), updateStoreSettings);

export default router;
