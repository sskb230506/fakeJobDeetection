import { Router } from 'express';
import { analyzeJob, getJobAnalysisById, getHistoryByUserId } from '../controllers/jobController';

const router = Router();

router.post('/analyze', analyzeJob);
router.get('/:id', getJobAnalysisById);
router.get('/history/:userId', getHistoryByUserId);

export default router;
