import { Router } from 'express';
import { getCompanies, getCompanyById, verifyCompany, enrichCompanyByName } from '../controllers/companyController';

const router = Router();

router.get('/enrich', enrichCompanyByName);
router.get('/', getCompanies);
router.get('/:id', getCompanyById);
router.post('/verify', verifyCompany);

export default router;
