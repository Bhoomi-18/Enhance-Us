import { Router } from 'express';
import { createReview, getUserReviews } from '../controllers/reviewController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateUser);

router.post('/', createReview);
router.get('/user/:userId', getUserReviews);

export default router;
