import { Router } from 'express';
import {
  handleLogin,
  handleRegister,
  handleGetMe,
  handleBootstrapAdmin,
} from '../controllers/auth.controller.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.post('/login', handleLogin);
router.post('/bootstrap-admin', handleBootstrapAdmin);

// Protected routes (Requires valid JWT bearer token)
router.get('/me', authenticateToken, handleGetMe);

// Protected Admin-only routes (Requires valid JWT bearer token AND ADMIN role)
router.post('/register', authenticateToken, requireAdmin, handleRegister);

export default router;
