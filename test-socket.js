const io = require('socket.io-client');

// Connect to the server
const socket = io('http://localhost:3000');

console.log('🔗 Connecting to server...');

socket.on('connect', () => {
    console.log('✅ Connected to server with ID:', socket.id);
    
    // Send a test message
    console.log('📤 Sending test message...');
    socket.emit('user-message', {
        message: 'Hello, how are you?',
        language: 'en'
    });
});

socket.on('bot-response', (data) => {
    console.log('📥 Received bot response:');
    console.log('  Message:', data.message);
    console.log('  Emotion:', data.emotion);
    console.log('  Audio URL:', data.audioUrl ? 'Present' : 'Not present');
    console.log('  Timestamp:', data.timestamp);
    
    console.log('✅ SUCCESS: Bot response received successfully!');
    process.exit(0);
});

socket.on('crisis-detected', (data) => {
    console.log('🚨 Crisis detected:', data);
});

socket.on('error', (data) => {
    console.log('❌ Socket error:', data);
});

socket.on('connect_error', (error) => {
    console.log('❌ Connection error:', error);
    process.exit(1);
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected from server');
});

// Timeout after 30 seconds
setTimeout(() => {
    console.log('⏰ Test timeout - no response received');
    process.exit(1);
}, 30000);
