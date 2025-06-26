# SkillForge

A modern AI-powered web application that connects people based on their skills and enables intelligent project collaboration. Built with React, TypeScript, Firebase, and Google Gemini AI.

## 🚀 Features

### 🤖 AI-Powered Intelligence
- **Smart Skill Matching**: Advanced AI algorithms for accurate skill compatibility
- **Resume Analysis**: Automatic skill extraction from uploaded resumes
- **Project Enhancement**: AI-powered project description improvement
- **Profile Analysis**: Personalized insights and career recommendations
- **Chat Suggestions**: AI-generated conversation starters for better networking
- **Project Recommendations**: Personalized project ideas based on skills and interests

### 👤 User Management
- **Google Authentication**: Secure sign-in with Google
- **Profile Management**: Comprehensive user profiles with AI insights
- **Resume Upload**: Upload resumes for automatic skill extraction
- **AI Profile Analysis**: Get strengths, skill gaps, and career path recommendations

### 📋 Project Management
- **Project Creation**: Create projects with AI-enhanced descriptions
- **Smart Skill Extraction**: Automatic skill identification from project descriptions
- **Team Management**: Invite, accept, and manage team members
- **Request System**: Join requests with AI-powered match analysis
- **Project Status Tracking**: Monitor project progress and milestones

### 🔍 Advanced Search & Matching
- **AI-Powered Matching**: Intelligent skill compatibility scoring
- **User Directory**: Search and filter users by skills
- **Project Discovery**: Find projects that match your skills
- **Collaborator Suggestions**: AI-recommended team members

### 💬 Real-time Communication
- **Instant Messaging**: Real-time chat with project collaborators
- **AI Chat Suggestions**: Smart conversation starters
- **Project Context**: Chat within project context
- **Message Status**: Read receipts and delivery confirmation

## 🛠 Tech Stack

### Frontend
- **React 18** - Modern UI framework
- **TypeScript** - Type-safe development
- **Material-UI (MUI)** - Beautiful, responsive components
- **React Router** - Client-side routing

### Backend & Database
- **Firebase**
  - Authentication (Google Sign-in)
  - Firestore Database (NoSQL)
  - Cloud Storage (File uploads)
  - Security Rules (Data protection)

### AI & Machine Learning
- **Google Gemini AI** - Advanced language model
- **Natural Language Processing** - Text analysis and understanding
- **Skill Analysis** - Intelligent skill matching and recommendations

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase account
- Google Gemini API key

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/rahul-58/SkillForge.git
cd SkillForge
```

2. **Install dependencies:**
```bash
npm install
# or
yarn install
```

3. **Set up environment variables:**
   - Copy `env.example` to `.env`
   - Fill in your API keys and configuration

4. **Start the development server:**
```bash
npm start
# or
yarn start
```

### Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id

# Gemini AI Configuration (Required for AI features)
REACT_APP_GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Aparavi Configuration
REACT_APP_APARAVI_API_KEY=your_aparavi_api_key_here
```

### Firebase Setup

1. **Create a Firebase project** at [Firebase Console](https://console.firebase.google.com/)
2. **Enable Authentication** with Google provider
3. **Create Firestore Database** in production mode
4. **Set up Storage** for file uploads
5. **Configure security rules** (included in the project)
6. **Deploy security rules:**
```bash
firebase deploy --only firestore:rules
```

### Gemini AI Setup

1. **Get API Key** from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Add to .env file** as `REACT_APP_GEMINI_API_KEY`
3. **Enable AI features** in the application

## 🔒 Security

### API Keys and Credentials

This project uses environment variables to secure sensitive information:

1. **Create `.env` file** in the root directory
2. **Copy from `env.example`** and replace with your actual keys
3. **Never commit `.env`** - automatically ignored by git
4. **Validate environment variables** on startup

### Protected Information

The following sensitive data is automatically protected:
- API keys and credentials
- Firebase configuration
- User authentication tokens
- Database connection strings
- Service account files

### Firebase Security Rules

Secure Firestore rules that:
- Deny all access by default
- Allow authenticated users appropriate access
- Protect user data and project information
- Prevent unauthorized data access

## 🤖 AI Features in Detail

### Resume Skills Extraction
- **Upload Support**: PDF, DOC, DOCX files
- **AI Analysis**: Automatic skill identification
- **Smart Matching**: Filter against common skills
- **Profile Update**: Automatic skill addition

### Project Description Enhancement
- **AI Enhancement**: Improve project descriptions
- **Key Highlights**: Extract important features
- **Target Audience**: Identify ideal collaborators
- **Success Metrics**: Suggest measurable goals

### Profile Analysis
- **Strengths Identification**: AI analyzes user skills
- **Skill Gap Analysis**: Identify improvement areas
- **Career Recommendations**: Suggest career paths
- **Development Tips**: Personalized learning suggestions

### Smart Skill Matching
- **AI-Powered Scoring**: Advanced compatibility algorithms
- **Context Awareness**: Project-specific matching
- **Related Skills**: Intelligent skill relationships
- **Experience Consideration**: Level-based matching

### Chat Intelligence
- **Conversation Starters**: AI-generated suggestions
- **Context Awareness**: Project-specific recommendations
- **Professional Tone**: Appropriate for networking
- **One-Click Use**: Easy suggestion implementation

### Project Recommendations
- **Personalized Ideas**: Based on skills and interests
- **Skill Development**: Learning recommendations
- **Match Reasoning**: Explain why projects are suggested
- **Custom Suggestions**: Tailored to experience level

## 📁 Project Structure

```
src/
├── components/           # React components
│   ├── Chat.tsx         # Real-time messaging
│   ├── UserProfile.tsx  # Profile management with AI
│   ├── ProjectList.tsx  # Project discovery
│   ├── ProjectSubmission.tsx # Project creation with AI
│   └── ProjectManagement.tsx # Team management
├── services/            # Service integrations
│   ├── gemini.ts        # AI service functions
│   └── skillMatching.ts # Skill matching algorithms
├── config/              # Configuration files
│   └── firebase.ts      # Firebase setup
├── hooks/               # Custom React hooks
├── types/               # TypeScript definitions
└── utils/               # Utility functions
```

## 🎯 Usage Guide

### For New Users
1. **Sign up** with Google account
2. **Complete profile** with skills and experience
3. **Upload resume** for automatic skill extraction
4. **Get AI insights** on your profile
5. **Discover projects** that match your skills

### For Project Creators
1. **Create project** with description
2. **Use AI enhancement** to improve description
3. **Review extracted skills** and requirements
4. **Find collaborators** with AI-powered matching
5. **Manage team** and project progress

### For Collaborators
1. **Browse projects** in your skill area
2. **Request to join** with AI match analysis
3. **Chat with team** using AI suggestions
4. **Contribute skills** to project success

## 🔧 Development

### Available Scripts

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Deploy to Firebase
firebase deploy
```

### Code Quality

- **TypeScript** for type safety
- **ESLint** for code quality
- **Prettier** for code formatting
- **Material-UI** for consistent design

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit changes** (`git commit -m 'Add AmazingFeature'`)
4. **Push to branch** (`git push origin feature/AmazingFeature`)
5. **Open Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Use Material-UI components
- Implement proper error handling
- Add AI features where beneficial
- Maintain security standards

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code examples

## 🔮 Roadmap

- [ ] Advanced AI chat features
- [ ] Project analytics and insights
- [ ] Skill learning recommendations
- [ ] Team performance tracking
- [ ] Mobile application
- [ ] Integration with external platforms

---

**Built with ❤️ using React, TypeScript, Firebase, and Google Gemini AI** 
