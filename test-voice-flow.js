const io = require('socket.io-client');

// Connect to the server
const socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log('✅ Connected to server');
    
    // Test voice interaction flow
    console.log('🎤 Sending test message...');
    socket.emit('user-message', {
        message: 'I am feeling really sad today',
        language: 'en'
    });
});

socket.on('bot-response', (data) => {
    console.log('🤖 Bot Response:', {
        message: data.message,
        emotion: data.emotion,
        audioUrl: data.audioUrl ? 'AUDIO_URL_PRESENT' : 'NO_AUDIO_URL',
        crisis: data.crisis,
        timestamp: data.timestamp
    });
    
    if (data.audioUrl) {
        console.log('🔊 Audio URL received:', data.audioUrl);
        console.log('✅ VOICE FLOW TEST PASSED - Audio proxy URL generated successfully!');
    } else {
        console.log('❌ No audio URL received');
    }
    
    process.exit(0);
});

socket.on('crisis-detected', (data) => {
    console.log('🚨 Crisis detected:', data);
});

socket.on('error', (data) => {
    console.log('❌ Error:', data);
    process.exit(1);
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected from server');
});

// Timeout after 60 seconds
setTimeout(() => {
    console.log('⏰ Test timeout - exiting');
    process.exit(1);
}, 60000);
