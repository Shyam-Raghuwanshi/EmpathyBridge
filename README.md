# EmpathyBridge

An AI-powered emotional support companion that provides empathetic responses and real-time emotion analysis.

## Features

- 🤖 **AI-Powered Conversations**: Intelligent chatbot that provides empathetic responses
- 😊 **Emotion Detection**: Real-time analysis of emotional states from text
- 💬 **Real-time Communication**: WebSocket-based instant messaging
- 📱 **Progressive Web App**: Works on desktop and mobile devices
- 🎨 **Modern UI**: Beautiful, responsive design with emotion-based styling
- 🔒 **Privacy-Focused**: Conversations are processed securely

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
