# Digital Psychological Intervention System

A production-ready, full-stack mental health support platform that provides AI-powered first-aid chat, validated screening tools, confidential counsellor booking, educational resources, and moderated peer support.

## 🌟 Features

### 💬 **Deterministic AI First-Aid Chat**
- Trigger-based response system with consistent behavior
- Crisis keyword detection and immediate safety guidance
- Multi-language support (English, Hindi)
- Session consent management
- Integration with screening history for personalized responses

### 📊 **Validated Screening Tools**
- **PHQ-9** (Depression screening): 0-27 scale with standard severity bands
- **GAD-7** (Anxiety screening): 0-21 scale with clinical thresholds  
- Automated scoring and interpretation
- Consent-based result storage
- Historical tracking for authenticated users

### 👥 **Confidential Booking System**
- Browse qualified counsellors with availability
- Anonymous booking options
- Multiple contact preferences (email, phone, in-app)
- Status tracking (requested, confirmed, cancelled)
- Role-based access for counsellors and admins

### 📚 **Resource Hub**
- Categorized resources (videos, audio, guides)
- Multi-language content support
- Engagement tracking (views, downloads, plays)
- Upload capabilities for privileged users
- Content reporting system

### 🤝 **Moderated Peer Support**
- Community posts with tagging system
- Anonymous and authenticated participation
- Automated content filtering
- Moderation tools and reporting
- Like and comment functionality

### 👑 **Admin Panel** (Only at `/admin`)
- Comprehensive analytics dashboard
- User and content moderation
- Counsellor management
- System configuration
- **Security**: Hidden from navbar, admin-only access

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git
- (Optional) PostgreSQL for production

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/opsaan/digital-psychological-intervention-system.git
cd digital-psychological-intervention-system
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Initialize database:**
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

5. **Start the application:**
```bash
npm start
```

🎉 **Your application is now running at http://localhost:8080**

### Default Credentials
- **Admin**: `admin@example.com` / `Admin123!@#`
- **Demo User**: `demo@example.com` / `Demo123!@#`
- **Admin Panel**: http://localhost:8080/admin

## 📚 Complete Usage Tutorial

### 1. 🌍 **Language Selection & Theme**

**Changing Language:**
1. Look for the language dropdown in the top-right corner
2. Select between English and Hindi (हिन्दी)
3. The entire interface updates immediately
4. Your preference is saved for future visits

**Theme Toggle:**
1. Click the sun/moon icon in the header
2. Switch between light and dark modes
3. Theme preference persists across sessions

### 2. 💬 **First-Aid Chat System**

**Starting a Chat Session:**
1. Click "Start First-Aid Chat" on homepage or navigate to `/chat`
2. Choose whether to save the conversation:
   - **Save**: Conversation stored for future reference (requires login)
   - **Anonymous**: No data stored, completely private

**Using the Chat:**
1. Type your concerns in the message box
2. The system analyzes your text for:
   - **Crisis keywords**: Immediate safety resources
   - **Category classification**: Anxiety, depression, stress, etc.
   - **Severity assessment**: Based on keywords and screening history
3. Click quick reply buttons for common responses
4. Access crisis resources anytime via the persistent "Get Help Now" button

**Crisis Response:**
- Crisis keywords trigger immediate safety protocols
- Red banner appears with emergency contacts
- Helpline numbers and resources prominently displayed
- Safety planning guidance provided

### 3. 📊 **Mental Health Screenings**

**Taking PHQ-9 (Depression Screening):**
1. Navigate to `/screenings` or click "Take Screening"
2. Select "PHQ-9 Depression Assessment"
3. Answer 9 questions about the past 2 weeks
4. Receive clinical scoring and recommendations

**Taking GAD-7 (Anxiety Screening):**
1. Select "GAD-7 Anxiety Assessment"
2. Answer 7 questions about anxiety symptoms
3. Get severity assessment and guidance

### 4. 👥 **Booking Counsellor Sessions**

**Creating a Booking:**
1. Browse available counsellors
2. Select date/time and contact preferences
3. Choose anonymity level
4. Submit booking request
5. Track status updates

### 5. 📚 **Educational Resources**

**Accessing Content:**
1. Browse by type (videos, audio, guides)
2. Filter by language
3. Track engagement automatically
4. Report inappropriate content

### 6. 🤝 **Peer Support Community**

**Participating:**
1. Read community guidelines
2. Create posts with tags
3. Comment and support others
4. Report concerning content
5. All content is moderated for safety

### 7. 👑 **Admin Panel** (http://localhost:8080/admin)

**Admin Access Only:**
- URL: `/admin` (hidden from navbar)
- Requires admin credentials
- Non-admin users get 403 error

**Features:**
- Analytics dashboard with time-series data
- Content moderation tools
- User and counsellor management
- System configuration
- Crisis intervention monitoring

## 🔒 Security & Privacy

### Authentication
- JWT with refresh token rotation
- Role-based access control (Student, Counsellor, Moderator, Admin)
- Secure HTTP-only cookies
- CSRF protection

### Privacy Controls
- Anonymous sessions supported
- Consent-based data storage
- Data minimization approach
- Account deletion with anonymization

### Crisis Safety
- Real-time crisis keyword detection
- Immediate safety resource display
- Always-accessible help button
- Integration with crisis services

## 🏥 Technical Stack

- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **ORM**: Prisma
- **Authentication**: JWT with refresh tokens
- **Security**: Helmet, CORS, bcrypt, input sanitization
- **File Storage**: Multer with local storage
- **Testing**: Jest, Supertest

## 📞 Crisis Resources & Safety

### Immediate Help
- **Emergency Services**: 911 (US), 112 (EU), your local emergency number
- **Crisis Text Line**: Text HOME to 741741
- **National Suicide Prevention Lifeline**: 988 (US)

### International Resources
- **India**: KIRAN Mental Health Helpline: 1800-599-0019
- **UK**: Samaritans: 116 123
- **Canada**: Talk Suicide Canada: 1-833-456-4566
- **Australia**: Lifeline: 13 11 14

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow code style guidelines
4. Add tests for new functionality
5. Submit a pull request

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**⚠️ Important Disclaimer**: This application provides general mental health support and education. It is not intended to replace professional medical advice, diagnosis, or treatment. In case of emergency or suicidal thoughts, please contact emergency services immediately.

**🎉 Your complete Digital Psychological Intervention System is ready to use!**