import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

interface EmotionResult {
    label: string;
    confidence: number;
}

// Simple emotion detection using keyword matching
// In a real application, you would use a more sophisticated NLP service
const emotionKeywords = {
    happy: ['happy', 'joy', 'excited', 'great', 'wonderful', 'amazing', 'love', 'fantastic', 'excellent', 'good'],
    sad: ['sad', 'depressed', 'down', 'upset', 'cry', 'hurt', 'pain', 'loss', 'grief', 'lonely'],
    angry: ['angry', 'mad', 'furious', 'rage', 'hate', 'annoyed', 'frustrated', 'irritated'],
    anxious: ['anxious', 'worried', 'nervous', 'scared', 'fear', 'panic', 'stress', 'overwhelmed'],
    neutral: ['okay', 'fine', 'normal', 'alright']
};

export async function analyzeEmotion(text: string): Promise<EmotionResult> {
    try {
        const normalizedText = text.toLowerCase();
        const scores: { [key: string]: number } = {};
        
        // Initialize scores
        Object.keys(emotionKeywords).forEach(emotion => {
            scores[emotion] = 0;
        });
        
        // Count keyword matches
        Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
            keywords.forEach(keyword => {
                const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                const matches = normalizedText.match(regex);
                if (matches) {
                    scores[emotion] += matches.length;
                }
            });
        });
        
        // Find the emotion with the highest score
        let dominantEmotion = 'neutral';
        let maxScore = 0;
        
        Object.entries(scores).forEach(([emotion, score]) => {
            if (score > maxScore) {
                maxScore = score;
                dominantEmotion = emotion;
            }
        });
        
        // Calculate confidence based on score and text length
        const confidence = Math.min(maxScore / (text.split(' ').length * 0.3), 1);
        
        return {
            label: dominantEmotion,
            confidence: confidence || 0.1 // Minimum confidence
        };
        
    } catch (error) {
        console.error('Error analyzing emotion:', error);
        return {
            label: 'neutral',
            confidence: 0.1
        };
    }
}

// Advanced emotion analysis using OpenAI
export async function analyzeEmotionAdvanced(text: string): Promise<EmotionResult> {
    try {
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
            console.log('OpenAI API key not configured, falling back to simple analysis');
            return await analyzeEmotion(text);
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: `You are an emotion analysis expert. Analyze the emotional content of user messages and respond with a JSON object containing:
                    - label: one of "happy", "sad", "angry", "anxious", "excited", "neutral"
                    - confidence: a number between 0 and 1 representing how confident you are
                    
                    Consider the overall emotional tone, context, and intensity. Only respond with valid JSON.`
                },
                {
                    role: "user",
                    content: text
                }
            ],
            max_tokens: 100,
            temperature: 0.3
        });

        const response = completion.choices[0]?.message?.content;
        if (response) {
            try {
                const emotionData = JSON.parse(response);
                return {
                    label: emotionData.label || 'neutral',
                    confidence: Math.min(Math.max(emotionData.confidence || 0, 0), 1)
                };
            } catch (parseError) {
                console.error('Error parsing OpenAI response:', parseError);
                return await analyzeEmotion(text);
            }
        }
        
        return await analyzeEmotion(text);
        
    } catch (error) {
        console.error('Error in OpenAI emotion analysis:', error);
        return await analyzeEmotion(text);
    }
}

// Emotion intensity analysis
export function getEmotionIntensity(emotion: EmotionResult, text: string): string {
    const { confidence } = emotion;
    
    if (confidence > 0.8) return 'very high';
    if (confidence > 0.6) return 'high';
    if (confidence > 0.4) return 'moderate';
    if (confidence > 0.2) return 'low';
    return 'very low';
}

// Get appropriate response tone based on emotion
export function getResponseTone(emotion: EmotionResult): string {
    const { label } = emotion;
    
    switch (label) {
        case 'sad':
            return 'compassionate';
        case 'angry':
            return 'understanding';
        case 'anxious':
            return 'calming';
        case 'happy':
            return 'supportive';
        default:
            return 'neutral';
    }
}

// Crisis detection keywords and patterns
const crisisKeywords = {
    selfHarm: ['kill myself', 'end it all', 'suicide', 'self harm', 'hurt myself', 'cut myself', 'overdose'],
    depression: ['hopeless', 'worthless', 'no point', 'give up', 'can\'t go on', 'life is meaningless'],
    panic: ['can\'t breathe', 'panic attack', 'heart racing', 'going crazy', 'losing control'],
    substance: ['drinking too much', 'using drugs', 'addicted', 'relapse', 'substance']
};

interface CrisisResult {
    isCrisis: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: string[];
    resources: string[];
}

export function detectCrisis(text: string): CrisisResult {
    const normalizedText = text.toLowerCase();
    const detectedTypes: string[] = [];
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    // Check for crisis indicators
    Object.entries(crisisKeywords).forEach(([type, keywords]) => {
        keywords.forEach(keyword => {
            if (normalizedText.includes(keyword)) {
                detectedTypes.push(type);
            }
        });
    });
    
    // Determine severity
    if (detectedTypes.includes('selfHarm')) {
        severity = 'critical';
    } else if (detectedTypes.length >= 2) {
        severity = 'high';
    } else if (detectedTypes.length === 1) {
        severity = 'medium';
    }
    
    // Emergency resources
    const resources = severity === 'critical' ? [
        'National Suicide Prevention Lifeline: 988',
        'Crisis Text Line: Text HOME to 741741',
        'Emergency Services: 911'
    ] : [
        'National Suicide Prevention Lifeline: 988',
        'Crisis Text Line: Text HOME to 741741',
        'SAMHSA Helpline: 1-800-662-4357'
    ];
    
    return {
        isCrisis: detectedTypes.length > 0,
        severity,
        type: detectedTypes,
        resources
    };
}

// Language detection and support
interface LanguageSupport {
    code: string;
    name: string;
    murf_voice_id: string;
    emergency_resources: string[];
}

const supportedLanguages: { [key: string]: LanguageSupport } = {
    'en': {
        code: 'en-US',
        name: 'English',
        murf_voice_id: 'en-US-alex-neutral',
        emergency_resources: [
            'National Suicide Prevention Lifeline: 988',
            'Crisis Text Line: Text HOME to 741741'
        ]
    },
    'es': {
        code: 'es-ES',
        name: 'Spanish',
        murf_voice_id: 'es-ES-maria-warm',
        emergency_resources: [
            'Línea Nacional de Prevención del Suicidio: 988',
            'Línea de Crisis: Envía HOLA al 741741'
        ]
    },
    'fr': {
        code: 'fr-FR',
        name: 'French',
        murf_voice_id: 'fr-FR-pierre-calm',
        emergency_resources: [
            'Numéro national français de prévention du suicide: 3114',
            'SOS Amitié: 09 72 39 40 50'
        ]
    }
};

export function detectLanguage(text: string): string {
    // Simple language detection - in production, use a proper language detection service
    const spanishWords = ['soy', 'estoy', 'me siento', 'tengo', 'muy', 'mucho'];
    const frenchWords = ['je suis', 'je me sens', 'très', 'beaucoup', 'mon', 'ma'];
    
    const normalizedText = text.toLowerCase();
    
    const spanishMatches = spanishWords.filter(word => normalizedText.includes(word)).length;
    const frenchMatches = frenchWords.filter(word => normalizedText.includes(word)).length;
    
    if (spanishMatches > 0) return 'es';
    if (frenchMatches > 0) return 'fr';
    return 'en';
}

export function getLanguageSupport(languageCode: string): LanguageSupport {
    return supportedLanguages[languageCode] || supportedLanguages['en'];
}
