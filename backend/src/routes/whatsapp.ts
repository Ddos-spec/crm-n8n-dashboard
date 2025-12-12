import { Router } from 'express';
import { prisma } from '../index';
import { authMiddleware } from '../middleware/auth';
import axios from 'axios';
import { env } from '../config/env';

const router = Router();

router.post('/send', authMiddleware, async (req, res) => {
    try {
        const { phone, message } = req.body;
        // Mock integration
        const response = await axios.post(env.WHATSAPP_API_URL!, {
            phone,
            message,
            secret: env.WHATSAPP_API_KEY
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to send WhatsApp message' });
    }
});

router.post('/webhook', async (req, res) => {
    console.log("Webhook received", req.body);
    res.json({ status: 'ok' });
});

export default router;
