import { Router } from 'express';
import { prisma } from '../index';
import { authMiddleware } from '../middleware/auth';
import { calculateLeadScore } from '../services/leadScoringService';

const router = Router();

// List businesses
router.get('/', authMiddleware, async (req, res) => {
  try {
    const businesses = await prisma.business.findMany({
      take: 20,
      orderBy: { created_at: 'desc' }
    });
    res.json(businesses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

// Create business with auto-calculated lead score
router.post('/', authMiddleware, async (req, res) => {
  try {
    const data = req.body;
    const lead_score = calculateLeadScore(data);

    const business = await prisma.business.create({
      data: {
          ...data,
          lead_score
      }
    });
    res.json(business);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create business' });
  }
});

// Bulk Import (Mock)
router.post('/bulk-import', authMiddleware, async (req, res) => {
    // Implementation for bulk import would go here
    res.json({ message: "Bulk import successful" });
});


export default router;
