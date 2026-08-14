import { Router } from 'express';
import { handleFindUser, handleUpdateUser, handleDeleteUser } from '../controllers/user.controller.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// All user operations require valid JWT token and ADMIN role
router.use(authenticateToken);

router.get('/find', requireAdmin, handleFindUser);
router.patch('/:id', requireAdmin, handleUpdateUser);
router.delete('/:id', requireAdmin, handleDeleteUser);

export default router;
