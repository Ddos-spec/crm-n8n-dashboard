import { Router } from 'express';
import { prisma } from '../index';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/history/:customerId', authMiddleware, async (req, res) => {
    try {
        const history = await prisma.chatHistory.findMany({
            where: { customer_id: Number(req.params.customerId) },
            orderBy: { created_at: 'asc' }
        });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
});

router.post('/send', authMiddleware, async (req, res) => {
    // Send message logic
    res.json({ message: "Message sent" });
});

export default router;
