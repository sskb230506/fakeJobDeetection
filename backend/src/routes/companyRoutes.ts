import { Router } from 'express';
import { getCompanies, getCompanyById, verifyCompany } from '../controllers/companyController';

const router = Router();

router.get('/', getCompanies);
router.get('/:id', getCompanyById);
router.post('/verify', verifyCompany);

export default router;
