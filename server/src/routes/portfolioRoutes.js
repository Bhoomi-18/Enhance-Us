import express from 'express';
import * as portfolioController from '../controllers/portfolioController.js';
import { authenticateUser, optionalAuthenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// Retrieve user's portfolio items (public or authenticated permissions)
router.get('/user/:userId', optionalAuthenticateUser, portfolioController.getUserPortfolio);

// Manage user's own portfolio items
router.post('/', authenticateUser, portfolioController.createPortfolioItem);
router.patch('/:id', authenticateUser, portfolioController.updatePortfolioItem);
router.delete('/:id', authenticateUser, portfolioController.deletePortfolioItem);

// Server-verified exchange confirmation
router.post('/confirm-exchange', authenticateUser, portfolioController.confirmExchangeOutcome);

// One-click milestone achievement import
router.post('/from-milestone', authenticateUser, portfolioController.createFromMilestone);

export default router;
