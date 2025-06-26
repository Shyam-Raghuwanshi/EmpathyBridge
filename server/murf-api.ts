import dotenv from 'dotenv';
import OpenAI from 'openai';
import axios from 'axios';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

interface EmotionResult {
    label: string;
    confidence: number;
}

interface VoicePersonality {
    id: string;
    name: string;
    gender: string;
    emotion: string;
    accent: string;
}

// Murf voice personalities for different emotional states
const voicePersonalities: { [key: string]: VoicePersonality } = {
    sad: {
        id: "en-US-natalie",
        name: "Natalie",
        gender: "female",
        emotion: "compassionate",
        accent: "en-US"
    },
    anxious: {
        id: "en-US-sarah",
        name: "Sarah",
        gender: "female", 
        emotion: "calming",
        accent: "en-US"
    },
    angry: {
        id: "en-US-david",
        name: "David",
        gender: "male",
        emotion: "understanding",
        accent: "en-US"
    },
    happy: {
        id: "en-US-clint",
        name: "Clint",
        gender: "male",
        emotion: "supportive",
        accent: "en-US"
    },
    neutral: {
        id: "en-US-cooper",
        name: "Cooper", 
        gender: "male",
        emotion: "neutral",
        accent: "en-US"
    }
};

// Generate voice using Murf API
export async function generateVoiceResponse(text: string, emotion: EmotionResult): Promise<string | null> {
    console.log('generateVoiceResponse called with:', { text, emotion });
    
    try {
        if (!process.env.MURF_API_KEY || process.env.MURF_API_KEY === 'your_murf_api_key_here') {
            console.log('Murf API key not configured, skipping voice generation');
            return null;
        }

        console.log('Murf API key found, proceeding with voice generation');
        const voice = voicePersonalities[emotion.label] || voicePersonalities.neutral;
        console.log('Selected voice:', voice);
        
        // Use the correct Murf API format based on their documentation
        const data = {
            text: text,
            voiceId: voice.id,
        };

        console.log('Calling Murf API with data:', data);

        const response = await axios.post('https://api.murf.ai/v1/speech/generate', data, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'api-key': process.env.MURF_API_KEY,
            },
            timeout: 30000
        });

        console.log('Murf API response status:', response.status);
        console.log('Full Murf API response:', JSON.stringify(response.data, null, 2));

        if (response.data && response.data.audioFile) {
            console.log('Voice generated successfully with Murf API - audioFile found');
            return response.data.audioFile;
        } else if (response.data && response.data.audio_url) {
            console.log('Voice generated successfully with Murf API - audio_url found');
            return response.data.audio_url;
        } else if (response.data && response.data.url) {
            console.log('Voice generated successfully with Murf API - url found');
            return response.data.url;
        } else if (response.data && response.data.audio) {
            console.log('Voice generated successfully with Murf API - audio found');
            return response.data.audio;
        }
        
        console.log('No audio file in Murf response - checking all properties:', Object.keys(response.data));
        return null;
        
    } catch (error: any) {
        console.error('Error generating voice with Murf API:', error);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        return null;
    }
}

// Empathetic response templates based on emotions
const responseTemplates = {
    sad: [
        "I can hear the pain in your words, and I want you to know that your feelings are completely valid. It's okay to feel sad.",
        "I'm really sorry you're going through this difficult time. Remember that it's okay to not be okay sometimes.",
        "Your sadness is understandable, and I'm here to listen. Would you like to talk more about what's troubling you?",
        "I can sense you're hurting right now. Please know that these difficult feelings won't last forever.",
        "It sounds like you're carrying a heavy burden. I'm here to support you through this."
    ],
    
    angry: [
        "I can feel the intensity of your frustration. It's completely normal to feel angry when things don't go as expected.",
        "Your anger is valid, and it's okay to feel this way. What's important is how we process these feelings.",
        "I understand you're feeling really frustrated right now. Would it help to talk through what's causing this anger?",
        "Anger often comes from a place of hurt or feeling unheard. I'm here to listen to you.",
        "It sounds like something really got under your skin. I'm here if you want to vent or work through it."
    ],
    
    anxious: [
        "I can sense your worry, and I want you to know that anxiety is something many people struggle with. You're not alone.",
        "It sounds like you're feeling overwhelmed. Let's take this one step at a time together.",
        "Anxiety can feel really intense, but remember that you've gotten through difficult times before.",
        "I hear the concern in your message. Would it help to talk about what's making you feel anxious?",
        "Your worries are valid, and it's okay to feel uncertain sometimes. I'm here to support you."
    ],
    
    happy: [
        "I can feel the positive energy in your message! It's wonderful to hear that you're feeling good.",
        "Your happiness is contagious! Thank you for sharing this positive moment with me.",
        "It's so great to hear you're doing well. What's been bringing you joy lately?",
        "I love hearing when things are going well for you. Keep embracing those positive feelings!",
        "Your good mood is brightening my day too! What's been the highlight of your experience?"
    ],
    
    neutral: [
        "Thank you for sharing that with me. I'm here to listen and support you however you need.",
        "I appreciate you opening up to me. How can I best support you today?",
        "I'm glad you feel comfortable sharing your thoughts with me. What's on your mind?",
        "Thank you for trusting me with your thoughts. I'm here to listen and help however I can.",
        "I'm here for you. Feel free to share whatever is on your heart or mind."
    ]
};

// Get a random response template based on emotion
function getResponseTemplate(emotion: string): string {
    const templates = responseTemplates[emotion as keyof typeof responseTemplates] || responseTemplates.neutral;
    return templates[Math.floor(Math.random() * templates.length)];
}

// Generate contextual follow-up questions
function getFollowUpQuestion(emotion: string): string {
    const followUps = {
        sad: [
            "Would you like to share more about what's been weighing on your heart?",
            "Is there anything specific that triggered these feelings?",
            "Have you been able to talk to anyone else about this?"
        ],
        angry: [
            "What do you think would help you feel better right now?",
            "Have you been able to express your feelings in a healthy way?",
            "Is there something specific that set off these feelings?"
        ],
        anxious: [
            "What thoughts are running through your mind right now?",
            "Are there any coping strategies that have helped you before?",
            "Would it help to break down what you're worried about?"
        ],
        happy: [
            "What's been the best part of your day or week?",
            "Would you like to share what's been making you feel so positive?",
            "How can you carry this positive energy forward?"
        ],
        neutral: [
            "What's been on your mind lately?",
            "Is there anything you'd like to explore or discuss?",
            "How are you feeling about things in general?"
        ]
    };
    
    const questions = followUps[emotion as keyof typeof followUps] || followUps.neutral;
    return questions[Math.floor(Math.random() * questions.length)];
}

// Enhanced response generation using OpenAI
export async function generateAIResponse(userMessage: string, emotion: EmotionResult): Promise<string> {
    try {
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
            console.log('OpenAI API key not configured, falling back to template responses');
            return await generateResponse(userMessage, emotion);
        }

        const emotionContext = {
            sad: "The user is feeling sad or down. Provide compassionate, validating support.",
            angry: "The user is feeling angry or frustrated. Acknowledge their feelings and help them process.",
            anxious: "The user is feeling anxious or worried. Offer calming, reassuring support.",
            happy: "The user is feeling happy or positive. Share in their joy and encourage them.",
            excited: "The user is feeling excited or energetic. Match their positive energy.",
            neutral: "The user has a neutral emotional state. Be supportive and encouraging."
        };

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: `You are EmpathyBridge, a compassionate AI emotional support companion. Your role is to:
                    - Provide empathetic, non-judgmental support
                    - Validate the user's feelings
                    - Ask thoughtful follow-up questions
                    - Use a warm, caring tone
                    - Keep responses concise but meaningful (2-3 sentences)
                    - Never provide medical advice or therapy
                    - Focus on emotional support and active listening
                    
                    Current emotional context: ${emotionContext[emotion.label as keyof typeof emotionContext] || emotionContext.neutral}
                    Confidence level: ${Math.round(emotion.confidence * 100)}%`
                },
                {
                    role: "user",
                    content: userMessage
                }
            ],
            max_tokens: 150,
            temperature: 0.7
        });

        const response = completion.choices[0]?.message?.content;
        return response || await generateResponse(userMessage, emotion);
        
    } catch (error) {
        console.error('Error with OpenAI response generation:', error);
        return await generateResponse(userMessage, emotion);
    }
}

// Main response generation function
export async function generateResponse(userMessage: string, emotion: EmotionResult): Promise<string> {
    try {
        // Try AI response first
        if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
            return await generateAIResponse(userMessage, emotion);
        }
        // Get base empathetic response
        const baseResponse = getResponseTemplate(emotion.label);
        
        // Add follow-up question if confidence is high enough
        let response = baseResponse;
        if (emotion.confidence > 0.3) {
            const followUp = getFollowUpQuestion(emotion.label);
            response += ` ${followUp}`;
        }
        
        return response;
        
    } catch (error) {
        console.error('Error generating response:', error);
        return "I'm here to listen and support you. Please feel free to share what's on your mind.";
    }
}

// Generate response using Murf API (placeholder for future implementation)
export async function generateMurfResponse(userMessage: string, emotion: EmotionResult): Promise<string> {
    try {
        // This is where you would integrate with Murf API for voice generation
        // const murfApiKey = process.env.MURF_API_KEY;
        
        // For now, return text response
        return await generateResponse(userMessage, emotion);
        
    } catch (error) {
        console.error('Error with Murf API:', error);
        return await generateResponse(userMessage, emotion);
    }
}

// Validate and sanitize user input
export function sanitizeInput(input: string): string {
    // Remove potential harmful content
    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .trim()
        .substring(0, 1000); // Limit length
}

// Generate personalized response based on conversation history
export async function generatePersonalizedResponse(
    userMessage: string, 
    emotion: EmotionResult, 
    conversationHistory: string[] = []
): Promise<string> {
    try {
        // Analyze conversation patterns
        const hasRepeatedConcerns = conversationHistory.some(msg => 
            msg.toLowerCase().includes(userMessage.toLowerCase().substring(0, 20))
        );
        
        if (hasRepeatedConcerns) {
            return "I notice you've mentioned something similar before. Sometimes it helps to look at recurring thoughts from a different angle. Would you like to explore this pattern together?";
        }
        
        return await generateResponse(userMessage, emotion);
        
    } catch (error) {
        console.error('Error generating personalized response:', error);
        return await generateResponse(userMessage, emotion);
    }
}
