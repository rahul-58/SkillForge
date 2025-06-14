# SkillForge

A modern web application that connects people based on their skills and enables project collaboration. Built with React, TypeScript, and Firebase.

## Features

- **User Authentication**
  - Google Sign-in
  - Secure user sessions
  - Profile management

- **Project Management**
  - Create and manage projects
  - Define required skills
  - AI-powered skill matching
  - Project status tracking

- **Skill Matching**
  - Advanced skill analysis
  - Match percentage calculation
  - Skill recommendations
  - Category-based matching

- **Real-time Chat**
  - One-on-one messaging
  - Project-specific conversations
  - Message status indicators
  - Real-time updates

- **User Directory**
  - Search users by name or skills
  - Skill-based filtering
  - Direct messaging
  - Email contact

## Tech Stack

- **Frontend**
  - React 18
  - TypeScript
  - Material-UI (MUI)
  - React Router

- **Backend**
  - Firebase
    - Authentication
    - Firestore Database
    - Cloud Storage
    - Security Rules

- **AI/ML**
  - Google Gemini API
  - Natural Language Processing
  - Skill Analysis

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/skill-match-connect.git
cd skill-match-connect
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env` file in the root directory and add your Firebase configuration:
```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_GEMINI_API_KEY=your_gemini_api_key
```

4. Start the development server:
```bash
npm start
# or
yarn start
```

### Firebase Setup

1. Create a new Firebase project
2. Enable Authentication with Google provider
3. Create a Firestore database
4. Set up Storage
5. Add Firebase configuration to your environment variables
6. Deploy Firebase security rules

## Project Structure

```
src/
├── components/        # React components
├── config/           # Configuration files
├── hooks/            # Custom React hooks
├── services/         # Service integrations
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
└── App.tsx           # Root component
```

## Features in Detail

### Project Creation
- Create projects with title and description
- Automatic skill extraction
- AI-powered project analysis
- Match potential collaborators

### Skill Matching
- Advanced algorithm for skill comparison
- Direct and related skill matching
- Experience level consideration
- Category-based matching

### Real-time Chat
- Instant messaging
- Message status tracking
- Conversation management
- Project context awareness

### User Directory
- Comprehensive user search
- Skill-based filtering
- Direct contact options
- Profile viewing

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Material-UI for the component library
- Firebase for backend services
- Google Gemini for AI capabilities
- React community for inspiration and support 