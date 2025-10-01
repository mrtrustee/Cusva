// server.js
const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// VAPI API configuration
const VAPI_BASE_URL = 'https://api.vapi.ai';
const VAPI_API_KEY = process.env.VAPI_API_KEY;

// Create assistant
app.post('/create-assistant', async (req, res) => {
    try {
        const response = await axios.post(
            `${VAPI_BASE_URL}/assistant`,
            {
                name: "Customer Service AI",
                firstMessage: "Hello! Thank you for calling our customer service. How can I help you today?",
                model: {
                    provider: "openai",
                    model: "gpt-4",
                    messages: [
                        {
                            role: "system",
                            content: `You are a friendly customer service representative for TechStore Inc. 
              Company info: We sell electronics, computers, and gadgets.
              Products: Laptops, smartphones, headphones, smartwatches.
              Services: Free shipping, 30-day return policy, 24/7 support.
              
              Capabilities:
              - Product information and availability
              - Order status checking
              - Return and exchange processing
              - Technical support basics
              - Store hours and locations
              
              Guidelines:
              - Always verify order numbers (format: TS-XXXXXX)
              - Be empathetic and patient
              - Escalate complex technical issues
              - Keep responses conversational and brief`
                        }
                    ]
                },
                voice: {
                    provider: "11labs",
                    voiceId: "rachel"
                },
                server: {
                    url: `${req.protocol}://${req.get('host')}/webhook`
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${VAPI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Error creating assistant:', error.response?.data);
        res.status(500).json({ error: 'Failed to create assistant' });
    }
});

// Webhook for handling conversations
app.post('/webhook', async (req, res) => {
    const { type, message, call } = req.body;

    console.log('Webhook received:', type);

    switch (type) {
        case 'conversation.update':
            // Handle conversation updates
            if (message?.type === 'transcript' && message.transcript) {
                console.log('User said:', message.transcript);

                // You can add custom logic here based on transcript
                if (message.transcript.toLowerCase().includes('order status')) {
                    // Custom order lookup logic
                    console.log('Order status inquiry detected');
                }
            }
            break;

        case 'function.call':
            // Handle function calls from the AI
            const functionCall = message.functionCall;
            if (functionCall.name === 'getOrderStatus') {
                const orderNumber = functionCall.parameters.orderNumber;
                const status = await lookupOrderStatus(orderNumber);

                return res.json({
                    result: {
                        orderStatus: status,
                        orderNumber: orderNumber
                    }
                });
            }
            break;

        case 'call.end':
            // Handle call end - log analytics, update CRM, etc.
            console.log('Call ended:', call);
            break;
    }

    res.json({ success: true });
});

// Mock order status lookup
async function lookupOrderStatus(orderNumber) {
    const orders = {
        'TS-123456': 'Shipped - Expected delivery: Tomorrow',
        'TS-789012': 'Processing - Will ship in 24 hours',
        'TS-345678': 'Delivered - Left at front door'
    };

    return orders[orderNumber] || 'Order not found. Please verify order number.';
}

// Get call analytics
app.get('/analytics/:callId', async (req, res) => {
    try {
        const response = await axios.get(
            `${VAPI_BASE_URL}/call/${req.params.callId}`,
            {
                headers: {
                    'Authorization': `Bearer ${VAPI_API_KEY}`
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch call data' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});