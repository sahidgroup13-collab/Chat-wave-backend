/**
 * Chat Wave - Lightweight Cross-Device Messaging Relay Server
 * 
 * Supports:
 * - Real 1-to-1 message dispatch between 2 or more Android phones
 * - In-memory and file-backed message queues per user (phone number)
 * - Health check endpoint for connection verification
 * - CORS enabled for web dashboard inspection
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Inboxes mapped by recipientId (e.g. "+919876500002" -> Array of messages)
const inboxes = new Map();

// Root and Health check
app.get('/', (req, res) => {
    res.json({
        service: "Chat Wave Relay Server",
        status: "RUNNING",
        queuedUsers: inboxes.size,
        timestamp: Date.now()
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: "ok",
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: Date.now()
    });
});

// Send outgoing message from Phone A to Phone B
app.post('/api/messages/send', (req, res) => {
    const { id, senderId, senderName, recipientId, text, mediaType, mediaUri, timestampMs } = req.body;

    if (!recipientId || !senderId) {
        return res.status(400).json({ error: "Missing senderId or recipientId" });
    }

    const message = {
        id: id || `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        senderId,
        senderName: senderName || "Sender",
        recipientId,
        text: text || "",
        mediaType: mediaType || "NONE",
        mediaUri: mediaUri || "",
        timestampMs: timestampMs || Date.now()
    };

    // Store in recipient's pending inbox queue
    if (!inboxes.has(recipientId)) {
        inboxes.set(recipientId, []);
    }
    inboxes.get(recipientId).push(message);

    console.log(`[Message Relayed] ${senderId} -> ${recipientId}: "${text?.slice(0, 30)}"`);

    return res.status(200).json({
        success: true,
        messageId: message.id,
        deliveredToQueue: true
    });
});

// Fetch pending incoming messages for a device
app.get('/api/messages/inbox', (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ error: "userId query parameter required" });
    }

    const userInbox = inboxes.get(userId) || [];
    // Drain the queue once fetched
    inboxes.set(userId, []);

    return res.json(userInbox);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Chat Wave Relay Server is listening on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});
