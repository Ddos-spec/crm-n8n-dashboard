import { Router } from 'express';
import { prisma } from '../index';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const knowledge = await prisma.knowledgeAI.findMany();
        res.json(knowledge);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch knowledge base' });
    }
});

router.post('/search', authMiddleware, async (req, res) => {
    // Search logic using match_knowledge function
    res.json([]);
});

export default router;
