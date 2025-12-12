import { Router } from 'express';
import { prisma } from '../index';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const escalations = await prisma.escalation.findMany();
        res.json(escalations);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch escalations' });
    }
});

export default router;
