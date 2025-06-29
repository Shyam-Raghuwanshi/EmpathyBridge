const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function testMurfAPI() {
    console.log('=== Murf API Debug Tool ===\n');
    
    // Check API key
    const apiKey = process.env.MURF_API_KEY;
    console.log('1. API Key Check:');
    if (!apiKey || apiKey === 'your_murf_api_key_here') {
        console.log('❌ MURF_API_KEY not configured or using placeholder value');
        console.log('Please set MURF_API_KEY in your environment variables');
        return;
    } else {
        console.log('✅ API key found:', apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4));
    }
    
    console.log('\n2. Testing Voice List API:');
    try {
        const voiceResponse = await axios.get('https://api.murf.ai/v1/speech/voices', {
            headers: {
                'Accept': 'application/json',
                'api-key': apiKey,
            },
            timeout: 15000
        });
        
        console.log('✅ Voice API Status:', voiceResponse.status);
        console.log('✅ Available voices:', voiceResponse.data?.voices?.length || 'Unknown');
        
        if (voiceResponse.data?.voices?.length > 0) {
            console.log('Sample voices:');
            voiceResponse.data.voices.slice(0, 3).forEach(voice => {
                console.log(`  - ${voice.name} (${voice.id}) - ${voice.gender}, ${voice.accent}`);
            });
        }
    } catch (error) {
        console.log('❌ Voice API Error:', error.response?.status, error.response?.data || error.message);
    }
    
    console.log('\n3. Testing Voice Generation API:');
    try {
        const testText = "Hello, this is a test message.";
        const testVoiceId = "en-US-cooper"; // Default voice
        
        const generateResponse = await axios.post('https://api.murf.ai/v1/speech/generate', {
            text: testText,
            voiceId: testVoiceId,
            format: 'mp3',
            speed: 1.0,
            pitch: 1.0
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'api-key': apiKey,
                'User-Agent': 'EmpathyBridge/1.0'
            },
            timeout: 45000,
            validateStatus: function (status) {
                return status >= 200 && status < 500;
            }
        });
        
        console.log('✅ Generation API Status:', generateResponse.status);
        console.log('✅ Response headers:', generateResponse.headers);
        console.log('✅ Response data keys:', Object.keys(generateResponse.data || {}));
        console.log('✅ Full response:', JSON.stringify(generateResponse.data, null, 2));
        
        // Check for audio URL in response
        const responseData = generateResponse.data;
        const possibleUrlFields = [
            'audioFile', 'audio_url', 'url', 'audio', 'audioUrl', 
            'download_url', 'file_url', 'result', 'data'
        ];
        
        let foundAudioUrl = false;
        for (const field of possibleUrlFields) {
            if (responseData && responseData[field]) {
                console.log(`🎵 Audio URL found in '${field}':`, responseData[field]);
                foundAudioUrl = true;
                break;
            }
        }
        
        if (!foundAudioUrl) {
            console.log('❌ No audio URL found in response');
        }
        
    } catch (error) {
        console.log('❌ Generation API Error:', error.response?.status, error.response?.data || error.message);
        if (error.response?.data) {
            console.log('Error details:', JSON.stringify(error.response.data, null, 2));
        }
    }
    
    console.log('\n=== Debug Complete ===');
}

// Run the test
testMurfAPI().catch(console.error);
