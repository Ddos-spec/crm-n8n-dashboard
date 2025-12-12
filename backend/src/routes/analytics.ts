import { Router } from 'express';
import { prisma } from '../index';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/dashboard', authMiddleware, async (req, res) => {
    try {
        const total_businesses = await prisma.business.count();
        const active_customers = await prisma.customer.count({
            where: { status: 'active' }
        });
        const unresolved_escalations = await prisma.escalation.count({
            where: { status: { in: ['open', 'in_progress'] } }
        });

        // Try to query materialized views if they exist (need raw query)
        // In a real scenario, we might want to refresh them periodically: REFRESH MATERIALIZED VIEW ...

        res.json({
            total_businesses,
            active_customers,
            unresolved_escalations
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

router.get('/campaigns', authMiddleware, async (req, res) => {
    try {
        // Query the materialized view
        const stats = await prisma.$queryRaw`SELECT * FROM campaign_performance`;

        // Serialize BigInt if any
        const serializedStats = JSON.parse(JSON.stringify(stats, (_, v) =>
            typeof v === 'bigint' ? v.toString() : v
        ));

        res.json(serializedStats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch campaign stats' });
    }
});

router.post('/refresh-cache', authMiddleware, async (req, res) => {
    try {
        await prisma.$executeRaw`REFRESH MATERIALIZED VIEW campaign_performance`;
        await prisma.$executeRaw`REFRESH MATERIALIZED VIEW customer_engagement_stats`;
        res.json({ message: 'Cache refreshed' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to refresh cache' });
    }
});

export default router;
