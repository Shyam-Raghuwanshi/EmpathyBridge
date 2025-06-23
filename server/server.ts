import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import { analyzeEmotion, analyzeEmotionAdvanced, detectCrisis, detectLanguage, getLanguageSupport } from './emotion-analyzer';
import { generateResponse, generateAIResponse, generateVoiceResponse } from './murf-api';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Configure multer for voice file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed'));
        }
    }
});

// Store conversation history for each socket
const conversationHistory = new Map<string, Array<{message: string, emotion: any, timestamp: Date}>>();

// Serve static files from public directory
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Initialize conversation history for the new socket
    conversationHistory.set(socket.id, []);

    socket.on('user-message', async (data) => {
        try {
            const { message, language } = data;
            console.log('Received message:', message);

            // Detect language if not provided
            const detectedLanguage = language || detectLanguage(message);
            const languageSupport = getLanguageSupport(detectedLanguage);
            
            // Analyze emotion using advanced AI if available
            const emotion = await analyzeEmotionAdvanced(message);
            console.log('Detected emotion:', emotion);

            // Crisis detection
            const crisisResult = detectCrisis(message);
            console.log('Crisis detection:', crisisResult);

            // Add to conversation history
            const history = conversationHistory.get(socket.id) || [];
            history.push({
                message,
                emotion,
                timestamp: new Date()
            });
            conversationHistory.set(socket.id, history.slice(-10)); // Keep last 10 messages

            // Generate empathetic response using AI if available
            const botResponse = await (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here' 
                ? generateAIResponse(message, emotion)
                : generateResponse(message, emotion));
            console.log('Generated response:', botResponse);

            // Generate voice response if Murf API is available
            const audioUrl = await generateVoiceResponse(botResponse, emotion);

            // Send response back to client
            const responseData = {
                message: botResponse,
                emotion: emotion,
                crisis: crisisResult,
                language: languageSupport,
                audioUrl: audioUrl,
                timestamp: new Date().toISOString()
            };

            if (crisisResult.isCrisis) {
                socket.emit('crisis-detected', {
                    severity: crisisResult.severity,
                    resources: crisisResult.resources,
                    message: crisisResult.severity === 'critical' 
                        ? "I'm very concerned about you right now. Please reach out for immediate help."
                        : "I notice you might be going through a difficult time. Here are some resources that might help."
                });
            }

            socket.emit('bot-response', responseData);

        } catch (error) {
            console.error('Error processing message:', error);
            socket.emit('error', {
                message: 'Sorry, I encountered an error while processing your message.'
            });
        }
    });

    socket.on('voice-message', async (data: any) => {
        try {
            // This would handle voice input processing
            // For now, we'll just acknowledge receipt
            socket.emit('voice-received', {
                message: 'Voice message received and is being processed...'
            });
        } catch (error) {
            console.error('Error processing voice message:', error);
            socket.emit('error', {
                message: 'Sorry, I encountered an error processing your voice message.'
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Remove conversation history for the disconnected socket
        conversationHistory.delete(socket.id);
    });
});

// Test endpoint for Murf API
app.get('/test-murf', async (req, res) => {
    try {
        const testEmotion = { label: 'neutral', confidence: 0.8 };
        const audioUrl = await generateVoiceResponse('Hello, this is a test of the Murf API integration.', testEmotion);
        
        if (audioUrl) {
            res.json({ 
                success: true, 
                audioUrl: audioUrl,
                message: 'Murf API test successful' 
            });
        } else {
            res.json({ 
                success: false, 
                message: 'Murf API test failed - no audio URL returned' 
            });
        }
    } catch (error: any) {
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Unknown error',
            message: 'Murf API test failed with error' 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 EmpathyBridge server running on port ${PORT}`);
    console.log(`📱 Open http://localhost:${PORT} in your browser`);
});

export default app;
