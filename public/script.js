// Initialize Socket.IO connection
const socket = io();

console.log('Socket.IO initialized');

// Add connection event listeners
socket.on('connect', () => {
    console.log('Connected to server with socket ID:', socket.id);
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
});

// DOM elements - will be initialized in DOMContentLoaded
let messagesArea, messageInput, sendButton, emotionResult, voiceButton, playAudioButton;
let languageSelect, emergencyResources, resourcesList;
let toggleHighContrast, toggleLargeText, toggleVoiceOnly;

// State management
let isProcessing = false;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let currentAudioUrl = null;
let recognition = null;
let audioAutoplayEnabled = false;
let isListening = false;
let silenceTimeout = null;
let maxRecordingTimeout = null;
let speechRecognitionRetries = 0;
let maxRetries = 2;
let currentAudio = null;
let isAISpeaking = false;
let speechDetectionTimeout = null;

// Initialize speech recognition if available
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true; // Keep listening continuously
    recognition.interimResults = true; // Enable interim results
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    
    // Set up recognition event handlers
    recognition.onstart = () => {
        console.log('Speech recognition started');
        isListening = true;
        speechRecognitionRetries = 0; // Reset retry counter on successful start
        addMessage('🎤 Listening... (speak clearly)', 'system');
        updateVoiceButtonState();
        
        // Clear any previous silence timeout
        if (silenceTimeout) {
            clearTimeout(silenceTimeout);
            silenceTimeout = null;
        }
    };
    
    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            
            if (result.isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        // Show interim results for immediate feedback
        if (interimTranscript || finalTranscript) {
            messageInput.value = (finalTranscript + interimTranscript).trim();
            console.log('Speech result - Final:', finalTranscript, 'Interim:', interimTranscript);
            
            // Reset silence timeout when we get results
            if (silenceTimeout) {
                clearTimeout(silenceTimeout);
                silenceTimeout = null;
            }
            
            // Reset speech detection timeout when we get any speech
            if (speechDetectionTimeout) {
                clearTimeout(speechDetectionTimeout);
                speechDetectionTimeout = null;
            }
            
            // Set a new timeout for silence detection (auto-stop when user stops talking)
            if (interimTranscript && !finalTranscript && isRecording) {
                speechDetectionTimeout = setTimeout(() => {
                    console.log('User stopped talking - auto-stopping recording');
                    if (messageInput.value.trim() && isRecording) {
                        // User stopped talking, treat interim as final
                        addMessage('🎤 Detected end of speech. Processing...', 'system');
                        stopVoiceRecording();
                        setTimeout(() => {
                            sendMessage();
                        }, 300);
                    }
                }, 2000); // 2 seconds of silence after speech = auto-stop
            }
        }
        
        // Process final transcript
        if (finalTranscript.trim()) {
            console.log('Final speech result:', finalTranscript);
            messageInput.value = finalTranscript.trim();
            
            // Clear any silence timeout
            if (silenceTimeout) {
                clearTimeout(silenceTimeout);
                silenceTimeout = null;
            }
            
            // Stop listening to avoid echo
            if (isRecording && recognition) {
                try {
                    recognition.stop();
                } catch (e) {
                    console.log('Recognition already stopped');
                }
            }
            
            // Send the message after a brief delay
            setTimeout(() => {
                if (messageInput.value.trim()) {
                    sendMessage();
                }
            }, 500);
        }
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        if (event.error === 'already-started') {
            console.log('Recognition already started, continuing...');
            return;
        }
        
        if (event.error === 'aborted') {
            console.log('Recognition was aborted, this is normal');
            return;
        }
        
        if (event.error === 'network') {
            console.log('Network error - speech recognition service unavailable');
            speechRecognitionRetries++;
            
            if (speechRecognitionRetries <= maxRetries) {
                addMessage(`🌐 Network issue (attempt ${speechRecognitionRetries}/${maxRetries}). Retrying...`, 'system');
                
                // Retry after a short delay
                setTimeout(() => {
                    if (isRecording && recognition) {
                        try {
                            recognition.start();
                        } catch (e) {
                            console.log('Retry failed:', e);
                            addMessage('❌ Speech recognition unavailable. Please type your message instead.', 'system');
                            // Keep recording for manual audio processing
                        }
                    }
                }, 1000);
            } else {
                addMessage('🌐 Speech recognition service unavailable. Please check your internet connection or type your message instead.', 'system');
                speechRecognitionRetries = 0; // Reset for next time
                // Don't stop recording - let user continue with audio recording
            }
            return;
        }
        
        if (event.error === 'not-allowed') {
            addMessage('🚫 Microphone access denied. Please allow microphone access and try again.', 'system');
            stopVoiceRecording();
            return;
        }
        
        if (event.error === 'no-speech') {
            console.log('No speech detected, continuing to listen...');
            addMessage('🤔 No speech detected. Please speak more clearly or try again.', 'system');
            return;
        }
        
        addMessage(`Voice recognition error: ${event.error}. Please try again or type your message.`, 'system');
        stopVoiceRecording();
    };
    
    recognition.onend = () => {
        console.log('Speech recognition ended');
        isListening = false;
        updateVoiceButtonState();
        
        // Clear all timeouts
        if (silenceTimeout) {
            clearTimeout(silenceTimeout);
            silenceTimeout = null;
        }
        
        if (speechDetectionTimeout) {
            clearTimeout(speechDetectionTimeout);
            speechDetectionTimeout = null;
        }
        
        // If we're still recording and have no text, provide feedback
        if (isRecording && !messageInput.value.trim()) {
            console.log('Recognition ended without results');
            // Don't restart automatically, let user click again
            addMessage('🎤 No speech detected. Click the microphone to try again.', 'system');
        }
    };
}

// Check if speech recognition is truly available
function isSpeechRecognitionAvailable() {
    return ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) && navigator.onLine;
}

// Check internet connectivity
function checkInternetConnection() {
    return navigator.onLine;
}

// Add connectivity listeners
window.addEventListener('online', () => {
    console.log('Internet connection restored');
    addMessage('🌐 Internet connection restored. Voice recognition is now available.', 'system');
});

window.addEventListener('offline', () => {
    console.log('Internet connection lost');
    addMessage('🌐 Internet connection lost. Voice recognition will be unavailable until connection is restored.', 'system');
});

// Function to enable audio autoplay after user interaction
function enableAudioAutoplay() {
    if (!audioAutoplayEnabled) {
        audioAutoplayEnabled = true;
        console.log('Audio autoplay enabled after user interaction');
    }
}

// Socket event listeners
socket.on('bot-response', (data) => {
    console.log('Frontend received bot-response:', data);
    console.log('Audio URL received:', data.audioUrl);
    
    removeTypingIndicator();
    addMessage(data.message, 'bot');
    if (data.emotion) {
        updateEmotionDisplay(data.emotion);
    }
    
    // Handle voice response - Auto-play audio
    if (data.audioUrl) {
        currentAudioUrl = data.audioUrl;
        playAudioButton.style.display = 'block';
        playAudioButton.title = 'Play Murf AI voice response';
        console.log('Audio URL set for playback:', data.audioUrl);
        
        // Auto-play the audio response if user has interacted
        if (audioAutoplayEnabled) {
            console.log('Auto-playing audio response');
            setTimeout(() => {
                playAudioResponse();
            }, 500); // Small delay to ensure UI is updated
        } else {
            addMessage('🔊 Audio response ready. Click the speaker button to hear it.', 'system');
        }
    } else {
        console.log('No audio URL received, hiding audio button');
        // Hide audio button if no audio available
        playAudioButton.style.display = 'none';
        currentAudioUrl = null;
    }
    
    if (data.crisis && data.crisis.isCrisis) {
        // Crisis handling is done in crisis-detected event
    }
    setProcessing(false);
});

socket.on('crisis-detected', (data) => {
    showCrisisResources(data);
    addMessage(data.message, 'bot', 'crisis');
});

socket.on('typing-indicator', () => {
    showTypingIndicator();
});

socket.on('emotion-analysis', (emotion) => {
    updateEmotionDisplay(emotion);
});

socket.on('voice-received', (data) => {
    addMessage('Voice message received: ' + data.message, 'system');
});

socket.on('error', (error) => {
    console.error('Socket error:', error);
    removeTypingIndicator();
    addMessage('Sorry, something went wrong. Please try again.', 'bot');
    setProcessing(false);
});

// Functions
function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message || isProcessing) {
        return;
    }
    
    addMessage(message, 'user');
    messageInput.value = '';
    setProcessing(true);
    
    // Send message to server with language preference
    socket.emit('user-message', { 
        message,
        language: languageSelect.value 
    });
}

function addMessage(text, sender, type = 'normal') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    if (type === 'crisis') {
        messageDiv.classList.add('crisis-message');
    } else if (sender === 'system') {
        messageDiv.classList.add('system-message');
    }
    
    messageDiv.innerHTML = `<p>${text}</p>`;
    
    // Add timestamp
    const timestamp = document.createElement('span');
    timestamp.className = 'timestamp';
    timestamp.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    messageDiv.appendChild(timestamp);
    
    if (messagesArea) {
        messagesArea.appendChild(messageDiv);
        messagesArea.scrollTop = messagesArea.scrollHeight;
    } else {
        console.error('messagesArea element not found!');
    }
    
    // Announce to screen readers
    if (sender === 'bot') {
        announceToScreenReader(text);
    }
}

function showTypingIndicator() {
    removeTypingIndicator(); // Remove any existing indicator
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message typing-indicator';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
        <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    
    messagesArea.appendChild(typingDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function updateEmotionDisplay(emotion) {
    const emotionLabel = emotionResult.querySelector('.emotion-label');
    const emotionConfidence = emotionResult.querySelector('.emotion-confidence');
    
    if (emotionLabel && emotionConfidence) {
        emotionLabel.textContent = emotion.label || 'Unknown';
        emotionLabel.className = `emotion-label emotion-${emotion.label?.toLowerCase() || 'neutral'}`;
        emotionConfidence.textContent = `Confidence: ${Math.round((emotion.confidence || 0) * 100)}%`;
    }
}

function setProcessing(processing) {
    isProcessing = processing;
    sendButton.disabled = processing;
    sendButton.textContent = processing ? 'Sending...' : 'Send';
    
    if (processing) {
        showTypingIndicator();
    }
}

// Update voice button visual state
function updateVoiceButtonState() {
    console.log('Updating voice button state - isRecording:', isRecording, 'isListening:', isListening, 'isAISpeaking:', isAISpeaking);
    
    // Remove all classes first
    voiceButton.classList.remove('recording', 'ai-speaking');
    
    if (isAISpeaking) {
        voiceButton.classList.add('ai-speaking');
        voiceButton.textContent = '🔇';
        voiceButton.title = 'AI is speaking. Click to interrupt and speak.';
    } else if (isListening || isRecording) {
        voiceButton.classList.add('recording');
        voiceButton.textContent = '🔴';
        voiceButton.title = 'Listening... Click to stop';
    } else {
        voiceButton.textContent = '🎤';
        voiceButton.title = 'Click to speak';
    }
}

// Voice recording functions
async function startVoiceRecording() {
    // Prevent multiple recordings
    if (isRecording || isListening) {
        console.log('Already recording or listening, ignoring start request');
        return;
    }
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Voice recording is not supported in your browser.');
        return;
    }
    
    try {
        console.log('Requesting microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        
        console.log('Microphone access granted');
        
        // Set up MediaRecorder for audio recording
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            processVoiceInput(audioBlob);
            
            // Stop all tracks to release microphone
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        isRecording = true;
        updateVoiceButtonState();
        
        // Clear any existing input to start fresh
        messageInput.value = '';
        
        // Set maximum recording timeout (30 seconds)
        maxRecordingTimeout = setTimeout(() => {
            console.log('Maximum recording time reached');
            addMessage('⏱️ Maximum recording time reached. Processing what we have...', 'system');
            stopVoiceRecording();
            
            // If we have text, send it
            setTimeout(() => {
                if (messageInput.value.trim()) {
                    sendMessage();
                } else {
                    addMessage('No speech detected during recording. Please try again.', 'system');
                }
            }, 500);
        }, 30000); // 30 seconds max
        
        // Start speech recognition
        if (recognition && !isListening) {
            console.log('Starting speech recognition...');
            try {
                recognition.start();
            } catch (error) {
                console.error('Error starting speech recognition:', error);
                addMessage('Speech recognition failed to start. Recording audio only - you can type your message when done.', 'system');
            }
        } else if (isListening) {
            console.log('Speech recognition already active');
            addMessage('🎤 Already listening... (speak clearly)', 'system');
        } else {
            addMessage('🎤 Recording audio... (Speech-to-text not available - you can type your message when done)', 'system');
        }
        
    } catch (error) {
        console.error('Error accessing microphone:', error);
        let errorMessage = 'Unable to access microphone. ';
        
        if (error.name === 'NotAllowedError') {
            errorMessage += 'Please allow microphone access and try again.';
        } else if (error.name === 'NotFoundError') {
            errorMessage += 'No microphone found. Please check your device.';
        } else {
            errorMessage += 'Please check your microphone settings.';
        }
        
        addMessage(errorMessage, 'system');
    }
}

function stopVoiceRecording() {
    if (mediaRecorder && isRecording) {
        console.log('Stopping voice recording...');
        mediaRecorder.stop();
        isRecording = false;
        
        // Clear timeouts
        if (silenceTimeout) {
            clearTimeout(silenceTimeout);
            silenceTimeout = null;
        }
        
        if (speechDetectionTimeout) {
            clearTimeout(speechDetectionTimeout);
            speechDetectionTimeout = null;
        }
        
        if (maxRecordingTimeout) {
            clearTimeout(maxRecordingTimeout);
            maxRecordingTimeout = null;
        }
        
        // Stop recognition first
        if (recognition && isListening) {
            try {
                recognition.stop();
            } catch (error) {
                console.log('Recognition already stopped');
            }
        }
        
        updateVoiceButtonState();
        
        // Give a moment for final results to come through
        setTimeout(() => {
            if (!messageInput.value.trim()) {
                addMessage('🎤 Recording stopped. Processing...', 'system');
            }
        }, 200);
    }
}

function processVoiceInput(audioBlob) {
    console.log('Processing voice input...');
    
    // Check if we have text from speech recognition
    if (messageInput.value.trim()) {
        console.log('Text recognized:', messageInput.value);
        addMessage('✅ Voice recognized: "' + messageInput.value + '"', 'system');
        // Don't auto-send here since recognition already handles it
    } else {
        console.log('No text recognized from voice input');
        addMessage('❌ Speech-to-text failed. Please type your message manually, or try the voice button again with a better internet connection.', 'system');
        
        // Focus on the input field so user can type
        setTimeout(() => {
            messageInput.focus();
            messageInput.placeholder = 'Type your message here (speech recognition failed)...';
        }, 500);
        
        // Reset placeholder after a delay
        setTimeout(() => {
            messageInput.placeholder = 'Type your message here...';
        }, 10000);
    }
}

function playAudioResponse() {
    if (currentAudioUrl) {
        console.log('Playing audio from URL:', currentAudioUrl);
        
        // Stop any existing audio
        stopAISpeech();
        
        currentAudio = new Audio();
        currentAudio.crossOrigin = 'anonymous'; // Handle CORS
        currentAudio.src = currentAudioUrl;
        
        // Add loading indicator
        playAudioButton.textContent = '⏳';
        playAudioButton.disabled = true;
        
        currentAudio.onloadstart = () => {
            console.log('Audio loading started...');
        };
        
        currentAudio.oncanplay = () => {
            console.log('Audio can start playing');
        };
        
        currentAudio.onplay = () => {
            console.log('Audio playback started');
            isAISpeaking = true;
            playAudioButton.textContent = '🔊';
            updateVoiceButtonForAISpeech();
        };
        
        currentAudio.onended = () => {
            console.log('Audio playback ended');
            isAISpeaking = false;
            playAudioButton.textContent = '🔊';
            playAudioButton.disabled = false;
            updateVoiceButtonState();
        };
        
        currentAudio.onerror = (error) => {
            console.error('Audio playback error:', error);
            isAISpeaking = false;
            playAudioButton.textContent = '🔊';
            playAudioButton.disabled = false;
            updateVoiceButtonState();
            addMessage('Sorry, I couldn\'t play the audio response. The audio file might not be ready yet.', 'system');
        };
        
        // Attempt to play
        currentAudio.play().catch(error => {
            console.error('Error playing audio:', error);
            isAISpeaking = false;
            playAudioButton.textContent = '🔊';
            playAudioButton.disabled = false;
            updateVoiceButtonState();
            
            if (error.name === 'NotAllowedError') {
                addMessage('Audio playback blocked. Please click the speaker button to hear the response.', 'system');
            } else {
                addMessage('Audio playback failed. Please try clicking the speaker button.', 'system');
            }
        });
        
    } else {
        console.log('No audio URL available');
        addMessage('No audio response available.', 'system');
    }
}

// Stop AI speech function
function stopAISpeech() {
    if (currentAudio && isAISpeaking) {
        console.log('Stopping AI speech');
        currentAudio.pause();
        currentAudio.currentTime = 0;
        isAISpeaking = false;
        playAudioButton.textContent = '🔊';
        playAudioButton.disabled = false;
        updateVoiceButtonState();
    }
}

// Update voice button when AI is speaking
function updateVoiceButtonForAISpeech() {
    if (isAISpeaking) {
        voiceButton.classList.add('ai-speaking');
        voiceButton.textContent = '🔇';
        voiceButton.title = 'AI is speaking. Click to interrupt and speak.';
    } else {
        voiceButton.classList.remove('ai-speaking');
        voiceButton.textContent = '🎤';
        voiceButton.title = 'Click to speak';
    }
}

// Check if speech recognition is truly available
function isSpeechRecognitionAvailable() {
    return ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) && navigator.onLine;
}

// Check internet connectivity
function checkInternetConnection() {
    return navigator.onLine;
}

// Crisis intervention functions
function showCrisisResources(crisisData) {
    emergencyResources.style.display = 'block';
    resourcesList.innerHTML = '';
    
    crisisData.resources.forEach(resource => {
        const resourceDiv = document.createElement('div');
        resourceDiv.className = 'resource-item';
        resourceDiv.innerHTML = `<strong>${resource}</strong>`;
        resourcesList.appendChild(resourceDiv);
    });
    
    // Flash the emergency section to draw attention
    emergencyResources.style.animation = 'flash 2s ease-in-out';
    setTimeout(() => {
        emergencyResources.style.animation = '';
    }, 2000);
}

// Accessibility functions
function toggleHighContrastMode() {
    document.body.classList.toggle('high-contrast');
    toggleHighContrast.classList.toggle('active');
    
    // Save preference
    localStorage.setItem('highContrast', document.body.classList.contains('high-contrast'));
}

function toggleLargeTextMode() {
    document.body.classList.toggle('large-text');
    toggleLargeText.classList.toggle('active');
    
    // Save preference
    localStorage.setItem('largeText', document.body.classList.contains('large-text'));
}

function toggleVoiceOnlyMode() {
    document.body.classList.toggle('voice-only');
    toggleVoiceOnly.classList.toggle('active');
    
    if (document.body.classList.contains('voice-only')) {
        // Focus on voice button
        voiceButton.focus();
        announceToScreenReader('Voice-only mode activated. Use the voice button to interact.');
    } else {
        // Focus on text input
        messageInput.focus();
        announceToScreenReader('Voice-only mode deactivated. You can now use text input.');
    }
    
    // Save preference
    localStorage.setItem('voiceOnly', document.body.classList.contains('voice-only'));
}

function announceToScreenReader(text) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    announcement.textContent = text;
    
    document.body.appendChild(announcement);
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

// Load accessibility preferences
function loadAccessibilityPreferences() {
    if (localStorage.getItem('highContrast') === 'true') {
        document.body.classList.add('high-contrast');
        toggleHighContrast.classList.add('active');
    }
    
    if (localStorage.getItem('largeText') === 'true') {
        document.body.classList.add('large-text');
        toggleLargeText.classList.add('active');
    }
    
    if (localStorage.getItem('voiceOnly') === 'true') {
        document.body.classList.add('voice-only');
        toggleVoiceOnly.classList.add('active');
    }
}

// Add connectivity listeners
window.addEventListener('online', () => {
    console.log('Internet connection restored');
    addMessage('🌐 Internet connection restored. Voice recognition is now available.', 'system');
});

window.addEventListener('offline', () => {
    console.log('Internet connection lost');
    addMessage('🌐 Internet connection lost. Voice recognition will be unavailable until connection is restored.', 'system');
});

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM elements
    messagesArea = document.getElementById('messages');
    messageInput = document.getElementById('messageInput');
    sendButton = document.getElementById('sendButton');
    emotionResult = document.getElementById('emotionResult');
    voiceButton = document.getElementById('voiceButton');
    playAudioButton = document.getElementById('playAudioButton');
    languageSelect = document.getElementById('languageSelect');
    emergencyResources = document.getElementById('emergencyResources');
    resourcesList = document.getElementById('resourcesList');
    toggleHighContrast = document.getElementById('toggleHighContrast');
    toggleLargeText = document.getElementById('toggleLargeText');
    toggleVoiceOnly = document.getElementById('toggleVoiceOnly');
    
    if (!messagesArea || !messageInput || !sendButton) {
        console.error('Critical DOM elements not found!');
        return;
    }
    
    console.log('✅ All DOM elements loaded successfully');
    
    // Add event listeners after DOM elements are found
    sendButton.addEventListener('click', () => {
        enableAudioAutoplay();
        sendMessage();
    });

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            enableAudioAutoplay();
            sendMessage();
        }
    });

    // Voice controls - Simple click-to-toggle mode
    voiceButton.addEventListener('click', (e) => {
        e.preventDefault();
        enableAudioAutoplay();
        
        // If AI is speaking, stop the AI speech first
        if (isAISpeaking) {
            console.log('Interrupting AI speech (user clicked mic)');
            stopAISpeech();
            addMessage('🔇 AI speech interrupted. You can speak now.', 'system');
            // Then start voice recording
            setTimeout(() => {
                startVoiceRecording();
            }, 200);
            return;
        }
        
        if (isRecording || isListening) {
            console.log('Stopping voice recording (user clicked)');
            stopVoiceRecording();
        } else {
            console.log('Starting voice recording (user clicked)');
            startVoiceRecording();
        }
    });

    // Support touch events for mobile
    voiceButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        enableAudioAutoplay();
        
        // If AI is speaking, stop the AI speech first
        if (isAISpeaking) {
            console.log('Interrupting AI speech (touch)');
            stopAISpeech();
            addMessage('🔇 AI speech interrupted. You can speak now.', 'system');
            // Then start voice recording
            setTimeout(() => {
                startVoiceRecording();
            }, 200);
            return;
        }
        
        if (isRecording || isListening) {
            console.log('Stopping voice recording (touch)');
            stopVoiceRecording();
        } else {
            console.log('Starting voice recording (touch)');
            startVoiceRecording();
        }
    });

    playAudioButton.addEventListener('click', () => {
        enableAudioAutoplay();
        playAudioResponse();
    });

    // Language selection
    languageSelect.addEventListener('change', (e) => {
        if (recognition) {
            recognition.lang = e.target.value === 'es' ? 'es-ES' : 
                              e.target.value === 'fr' ? 'fr-FR' : 'en-US';
        }
    });

    // Accessibility controls
    if (toggleHighContrast) {
        toggleHighContrast.addEventListener('click', toggleHighContrastMode);
    }
    if (toggleLargeText) {
        toggleLargeText.addEventListener('click', toggleLargeTextMode);
    }
    if (toggleVoiceOnly) {
        toggleVoiceOnly.addEventListener('click', toggleVoiceOnlyMode);
    }
    
    messageInput.focus();
    
    // Load accessibility preferences
    loadAccessibilityPreferences();
    
    // Check initial connectivity
    if (!navigator.onLine) {
        addMessage('🌐 No internet connection detected. Voice recognition will be unavailable.', 'system');
    }
    
    // Add welcome message after a short delay
    setTimeout(() => {
        addMessage('I\'m here to provide emotional support and understanding. Feel free to share what\'s on your mind, either by typing or using the voice button.', 'bot');
        
        // Add voice instructions
        setTimeout(() => {
            if (isSpeechRecognitionAvailable()) {
                addMessage('💡 Voice Tip: Click the microphone button (🎤) and speak clearly. I\'ll automatically respond with voice when available!', 'system');
            } else {
                addMessage('💡 Tip: Voice recognition is currently unavailable. Please type your messages or check your internet connection.', 'system');
            }
        }, 2000);
    }, 1000);
    
    // Set up keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Alt + V for voice input
        if (e.altKey && e.key === 'v') {
            e.preventDefault();
            console.log('Alt+V pressed, current state - isRecording:', isRecording, 'isListening:', isListening);
            
            if (!isRecording && !isListening) {
                startVoiceRecording();
            } else {
                stopVoiceRecording();
            }
        }
        
        // Alt + P for play audio
        if (e.altKey && e.key === 'p' && currentAudioUrl) {
            e.preventDefault();
            playAudioResponse();
        }
        
        // Escape to clear input
        if (e.key === 'Escape') {
            messageInput.value = '';
            messageInput.focus();
        }
    });
});

// Service Worker registration for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
