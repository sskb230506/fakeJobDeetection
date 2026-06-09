import { Router } from 'express';
import { createUser, getUser } from '../controllers/userController';

const router = Router();

router.post('/', createUser);
router.get('/:id', getUser);

export default router;
