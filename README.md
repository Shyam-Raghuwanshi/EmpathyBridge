# EmpathyBridge

An AI-powered emotional support companion that provides empathetic responses and real-time emotion analysis with natural voice interaction.

## 🎯 How I Used Murf API

EmpathyBridge leverages Murf API to transform text-based emotional support into natural, human-like voice conversations:

- **Emotion-Aware Voice Selection**: Automatically selects appropriate voice tones (Cooper for calm support, Hazel for gentle comfort) based on detected user emotions
- **Real-Time Voice Generation**: Converts AI empathetic responses into natural speech instantly using Murf's high-quality TTS
- **130+ Voice Options**: Users can personalize their support experience by choosing from Murf's diverse voice library
- **Seamless Integration**: Voice responses play automatically after text responses, creating fluid conversation flow
- **Accessibility Enhancement**: Makes emotional support accessible to users with reading difficulties or visual impairments

**Technical Implementation**: The app analyzes user emotions, generates empathetic text responses, then uses Murf API to create corresponding voice audio with appropriate emotional tone and pacing.

## 🌍 Use Case & Impact

### **Who Benefits:**
- **Mental Health Support Seekers**: People needing immediate emotional support when human counselors aren't available
- **Accessibility Community**: Visually impaired users or those with reading difficulties who prefer voice interaction
- **Healthcare Workers**: Frontline workers needing quick emotional decompression during breaks
- **Students & Young Adults**: Those experiencing stress, anxiety, or emotional challenges who prefer anonymous support

### **Real-World Applications:**
- **Crisis Intervention**: 24/7 accessible emotional support with voice responses for immediate comfort
- **Therapy Supplement**: Bridge between therapy sessions with consistent, empathetic voice interaction
- **Workplace Wellness**: Employee mental health support with natural voice conversations
- **Educational Settings**: Student counseling support that feels more personal through voice interaction

### **Impact & Innovation:**
- **Breaks Accessibility Barriers**: Voice-first emotional support makes help accessible to broader audiences
- **Reduces Stigma**: Anonymous, natural voice conversations feel less clinical than text-only chatbots
- **Immediate Availability**: Instant emotional support with human-like voice responses, no waiting times
- **Personalized Experience**: Voice selection creates emotional connection and user comfort
- **Scalable Solution**: One platform can support unlimited users simultaneously with consistent quality

*"Transforming digital emotional support from text-based chatbots to natural, empathetic voice conversations that truly connect with people in their moments of need."*

## 🏆 Technical Achievement

**Built in record time** with innovative features:
- **Smart Voice Integration**: Emotion-aware voice selection automatically matches AI response tone to user's emotional state
- **Seamless UX**: One-click voice interaction with manual control - users speak only when they choose to
- **Real-time Processing**: Instant speech-to-text → emotion analysis → empathetic response → natural voice output
- **Production Ready**: Full error handling, accessibility features, and mobile optimization

## Features

- 🤖 **AI-Powered Conversations**: Intelligent chatbot that provides empathetic responses
- 🎤 **Voice Interaction**: Natural speech-to-text input and AI voice responses powered by Murf API
- 🔊 **130+ Voice Options**: Personalize your experience with diverse, high-quality AI voices
- 😊 **Emotion Detection**: Real-time analysis of emotional states from text
- 💬 **Real-time Communication**: WebSocket-based instant messaging
- 📱 **Progressive Web App**: Works on desktop and mobile devices
- 🎨 **Modern UI**: Beautiful, responsive design with emotion-based styling
- 🔒 **Privacy-Focused**: Conversations are processed securely
- ♿ **Accessibility-First**: Voice controls, high contrast mode, and screen reader support

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript, Socket.IO Client
- **Backend**: Node.js, TypeScript, Express.js, Socket.IO
- **Emotion Analysis**: Custom keyword-based analysis (extensible to external APIs)
- **Styling**: Modern CSS with responsive design
- **PWA**: Service worker support for offline capabilities

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd EmpathyBridge
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

4. Build the TypeScript code
```bash
npm run build
```

5. Start the development server
```bash
npm run dev
```

6. Open your browser and navigate to `http://localhost:3000`

## Scripts

- `npm run dev` - Start development server with auto-reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
empathy-bridge/
├── public/                 # Frontend files
│   ├── index.html         # Main HTML file
│   ├── style.css          # Styling
│   ├── script.js          # Frontend JavaScript
│   └── manifest.json      # PWA manifest
├── server/                # Backend files
│   ├── server.ts          # Main server file
│   ├── emotion-analyzer.ts # Emotion detection logic
│   └── murf-api.ts        # Response generation
├── dist/                  # Compiled JavaScript (generated)
├── .env                   # Environment variables
├── tsconfig.json          # TypeScript configuration
├── package.json           # Project dependencies
└── README.md             # This file
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
PORT=3000
NODE_ENV=development
MURF_API_KEY=your_murf_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key_here
```

## Features in Detail

### Emotion Analysis
The application uses a keyword-based emotion detection system that analyzes user messages for emotional content. It can detect:
- Happy/Joy
- Sad/Depression
- Angry/Frustration
- Anxious/Worried
- Neutral

### Empathetic Responses
Based on the detected emotion, the AI generates appropriate empathetic responses that:
- Validate the user's feelings
- Provide emotional support
- Ask relevant follow-up questions
- Maintain a compassionate tone

### Real-time Communication
Using Socket.IO, the application provides:
- Instant message delivery
- Real-time emotion analysis
- Live response generation
- Connection status management

## Extending the Application

### Adding External APIs
To integrate with external emotion analysis or AI services:

1. Add API credentials to `.env`
2. Update `emotion-analyzer.ts` for emotion detection
3. Update `murf-api.ts` for response generation

### Database Integration
To add conversation history and user management:

1. Add database configuration to `.env`
2. Install database drivers (MongoDB, PostgreSQL, etc.)
3. Create models and controllers
4. Update server.ts with database connections

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

If you need help or have questions, please open an issue in the repository.

## Acknowledgments

- Built with modern web technologies
- Inspired by the need for accessible emotional support
- Designed with privacy and user well-being in mind
