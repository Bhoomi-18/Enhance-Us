import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';
import { adminRateLimiter } from '../middleware/adminRateLimiter.js';

const router = Router();

// Protect ALL admin routes with authentication, strict server-side allowlist, and rate limiting
router.use(authenticateUser);
router.use(requireAdmin);
router.use(adminRateLimiter());

// 1. Admin Verification
router.get('/auth/check', adminController.checkAdminStatus);

// 2. Overview Dashboard Metrics
router.get('/overview', adminController.getOverview);

// 3. User Management
router.get('/users', adminController.getUsers);
router.patch('/users/:id/suspend', adminController.suspendUser);
router.patch('/users/:id/reactivate', adminController.reactivateUser);

// 4. Usage Analytics & Conversion Funnel
router.get('/analytics', adminController.getAnalytics);

// 5. Feedback Centre
router.get('/feedback', adminController.getFeedback);
router.patch('/feedback/:id/status', adminController.updateFeedbackStatus);
router.post('/feedback/:id/notes', adminController.addFeedbackNote);
router.post('/feedback/import-csv', adminController.importFeedbackCsv);

// 6. Technical Health & Latency Telemetry
router.get('/health', adminController.getHealth);

// 7. Audit Trail
router.get('/audit-logs', adminController.getAuditLogs);

export default router;
