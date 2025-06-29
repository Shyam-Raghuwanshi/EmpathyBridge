import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import axios from 'axios';
import { analyzeEmotionAdvanced, detectCrisis, detectLanguage, getLanguageSupport } from './emotion-analyzer';
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

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files with proper MIME types
const publicPath = process.env.NODE_ENV === 'production' 
    ? path.join(__dirname, '../public')  // In production: dist/public (one level up from dist/server)
    : path.join(__dirname, '../public'); // In development: public

console.log('📁 Serving static files from:', publicPath);

// Static file serving with explicit MIME types
app.use(express.static(publicPath, {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json');
        } else if (path.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html');
        }
    }
}));

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

// Proxy route for audio files
app.get('/audio-proxy', async (req: Request, res: Response) => {
    try {
        const audioUrl = req.query.url as string;
        if (!audioUrl) {
            return res.status(400).json({ error: 'Missing audio URL' });
        }

        console.log('Proxying audio from:', audioUrl);
        
        // Fetch the audio file from Murf using axios
        const response = await axios.get(audioUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
        });

        // Set appropriate headers for audio
        res.set({
            'Content-Type': 'audio/wav',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Cache-Control': 'public, max-age=3600'
        });

        // Send the audio buffer
        res.send(response.data);
        
    } catch (error: any) {
        console.error('Error proxying audio:', error.message);
        res.status(500).json({ error: 'Failed to proxy audio file' });
    }
});

// Route to get available voices from Murf API
app.get('/api/get-voices', async (req: Request, res: Response) => {
    try {
        console.log('Fetching available voices from Murf API');
        
        if (!process.env.MURF_API_KEY || process.env.MURF_API_KEY === 'your_murf_api_key_here') {
            console.log('Murf API key not configured, returning mock data');
            return res.status(200).json({ 
                voices: [
                    { id: "en-US-cooper", name: "Cooper", gender: "Male", accent: "en-US" },
                    { id: "en-UK-hazel", name: "Hazel", gender: "Female", accent: "en-UK" },
                    { id: "en-US-imani", name: "Imani", gender: "Female", accent: "en-US" }
                ]
            });
        }
        
        const response = await axios.get('https://api.murf.ai/v1/speech/voices', {
            headers: {
                'Accept': 'application/json',
                'api-key': process.env.MURF_API_KEY,
            },
            timeout: 15000
        });
        
        console.log('Murf API voice response status:', response.status);
        
        if (response.data && Array.isArray(response.data)) {
            // Transform the Murf API response to our expected format
            const voices = response.data.map((voice: any) => ({
                id: voice.voiceId,
                name: voice.displayName.replace(/\s*\([MF]\)/, ''), // Remove (M) or (F) suffix
                gender: voice.gender,
                accent: voice.locale,
                description: voice.description,
                styles: voice.availableStyles
            }));
            
            return res.status(200).json({ voices });
        } else {
            console.log('Unexpected response format from Murf API:', response.data);
            return res.status(200).json({ 
                voices: [
                    { id: "en-US-cooper", name: "Cooper", gender: "Male", accent: "en-US" },
                    { id: "en-UK-hazel", name: "Hazel", gender: "Female", accent: "en-UK" },
                    { id: "en-US-imani", name: "Imani", gender: "Female", accent: "en-US" }
                ]
            });
        }
    } catch (error: any) {
        console.error('Error fetching voices from Murf API:', error);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        
        // Return mock data on error
        return res.status(200).json({ 
            voices: [
                { id: "en-US-cooper", name: "Cooper", gender: "Male", accent: "en-US" },
                { id: "en-UK-hazel", name: "Hazel", gender: "Female", accent: "en-UK" },
                { id: "en-US-imani", name: "Imani", gender: "Female", accent: "en-US" }
            ]
        });
    }
});

// Test endpoint for voice generation
app.post('/api/test-voice', async (req: Request, res: Response) => {
    try {
        const { text, voiceId } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }
        
        console.log('Testing voice generation with:', { text, voiceId });
        
        const emotion = { label: 'neutral', confidence: 1.0 };
        const audioUrl = await generateVoiceResponse(text, emotion, voiceId);
        
        return res.status(200).json({ 
            success: !!audioUrl,
            audioUrl: audioUrl,
            message: audioUrl ? 'Voice generation successful' : 'Voice generation failed'
        });
    } catch (error: any) {
        console.error('Voice test error:', error);
        return res.status(500).json({ 
            error: 'Voice generation test failed',
            details: error.message 
        });
    }
});

// Store conversation history for each socket
const conversationHistory = new Map<string, Array<{message: string, emotion: any, timestamp: Date}>>();

// Serve static files from public directory
app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Initialize conversation history for the new socket
    conversationHistory.set(socket.id, []);

    socket.on('user-message', async (data) => {
        try {
            const { message, language, voiceId } = data;
            console.log('Received message:', message);
            console.log('Voice ID:', voiceId || 'Not specified, using emotion-based voice');

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
            let murfAudioUrl: string | null = null;
            let voiceGenerationAttempts = 0;
            const maxVoiceAttempts = 2;
            
            while (voiceGenerationAttempts < maxVoiceAttempts && !murfAudioUrl) {
                try {
                    voiceGenerationAttempts++;
                    console.log(`Voice generation attempt ${voiceGenerationAttempts}/${maxVoiceAttempts}`);
                    
                    murfAudioUrl = await generateVoiceResponse(botResponse, emotion, voiceId);
                    console.log('Voice generation result - murfAudioUrl:', murfAudioUrl);
                    
                    if (!murfAudioUrl && voiceGenerationAttempts < maxVoiceAttempts) {
                        console.log('Voice generation failed, retrying with default voice...');
                        // Retry with default voice if custom voice failed
                        murfAudioUrl = await generateVoiceResponse(botResponse, emotion);
                    }
                } catch (error) {
                    console.error(`Voice generation attempt ${voiceGenerationAttempts} failed:`, error);
                    if (voiceGenerationAttempts >= maxVoiceAttempts) {
                        console.log('All voice generation attempts failed, proceeding without audio');
                    }
                }
            }

            // Create proxied URL if Murf audio is available
            // Use environment-based URL generation (works in both dev and production)
            const baseUrl = process.env.RENDER_EXTERNAL_URL || 
                (process.env.NODE_ENV === 'production' ? 
                    'https://empathybridge-3ntq.onrender.com' : 
                    `http://localhost:${PORT}`);
            
            const audioUrl = murfAudioUrl ? 
                `${baseUrl}/audio-proxy?url=${encodeURIComponent(murfAudioUrl)}` : 
                null;
            
            console.log('Final audio URL result:', audioUrl ? 'AUDIO_AVAILABLE' : 'NO_AUDIO');

            // Send response back to client
            const responseData = {
                message: botResponse,
                emotion: emotion,
                crisis: crisisResult,
                language: languageSupport,
                audioUrl: audioUrl,
                timestamp: new Date().toISOString()
            };

            console.log('Sending to frontend - responseData:', {
                ...responseData,
                audioUrl: audioUrl ? 'PROXIED_AUDIO_URL_PRESENT' : 'NO_AUDIO_URL'
            });

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

// Explicit routes for static files
app.get('/style.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(path.join(publicPath, 'style.css'));
});

app.get('/script.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(publicPath, 'script.js'));
});

app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(path.join(publicPath, 'manifest.json'));
});

app.get('/service-worker.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(publicPath, 'service-worker.js'));
});

// Serve the main app at root
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 EmpathyBridge server running on port ${PORT}`);
    console.log(`📱 Open http://localhost:${PORT} in your browser`);
});

export default app;
