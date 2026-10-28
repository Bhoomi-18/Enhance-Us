import { Router } from 'express';
import { createReview, getUserReviews, updateReview, deleteReview } from '../controllers/reviewController.js';
import { authenticateUser, requireEmailVerified } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateUser);

router.post('/', requireEmailVerified, createReview);
router.get('/user/:userId', getUserReviews);
router.patch('/:id', requireEmailVerified, updateReview);
router.delete('/:id', requireEmailVerified, deleteReview);

export default router;
