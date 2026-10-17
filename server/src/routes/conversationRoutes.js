import { Router } from 'express';
import { getConversations, getConversation, sendMessage } from '../controllers/conversationController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateUser);

router.get('/', getConversations);
router.get('/:id', getConversation);
router.post('/:id/messages', sendMessage);

export default router;
