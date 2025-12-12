import { Router } from 'express';
import { prisma } from '../index';
import { authMiddleware } from '../middleware/auth';
import { isCooldownActive } from '../services/cooldownService';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
        take: 20
    });

    // Add computed property for cooldown status if not handling in query
    const enhancedCustomers = customers.map(c => ({
        ...c,
        is_cooldown_active: isCooldownActive(c.cooldown_until)
    }));

    res.json(enhancedCustomers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
    try {
        const customer = await prisma.customer.create({
            data: req.body
        });
        res.json(customer);
    } catch (error) {
        res.status(500).json({error: 'Failed to create customer'});
    }
});

// Check cooldown
router.get('/cooldown-check/:id', authMiddleware, async (req, res) => {
    try {
        const customer = await prisma.customer.findUnique({
            where: { id: Number(req.params.id) }
        });
        if (!customer) return res.status(404).json({ error: "Customer not found" });

        res.json({
            id: customer.id,
            is_cooldown_active: isCooldownActive(customer.cooldown_until),
            cooldown_until: customer.cooldown_until
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check cooldown' });
    }
});


export default router;
