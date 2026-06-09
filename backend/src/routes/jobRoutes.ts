import { Router } from 'express';
import { analyzeJob, getJobAnalysisById, getHistoryByUserId, analyzeSalaryInfo } from '../controllers/jobController';

const router = Router();

router.post('/analyze', analyzeJob);
router.post('/analyze-salary', analyzeSalaryInfo);
router.get('/:id', getJobAnalysisById);
router.get('/history/:userId', getHistoryByUserId);

export default router;
