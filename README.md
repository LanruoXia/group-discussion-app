# AI-Powered Web Application for HKDSE English Group Interaction Practice

A full-stack web application for practicing English speaking skills, specifically designed for HKDSE students. The platform features real-time video discussions, AI-powered speech recognition, and automated evaluation.

## Features

- **Real-time Video Discussions**: Powered by Agora.io for high-quality video conferencing
- **Speech Recognition**: Real-time transcription using Web Speech API
- **AI Evaluation**: Automated assessment of speaking skills
- **User Authentication**: Secure login and registration with Supabase
- **Session Management**: Create, join, and manage discussion sessions
- **Waiting Room**: Pre-discussion preparation area
- **Cloud Recording**: Automatic recording of discussions for later review

## Tech Stack

- **Frontend**: Next.js 15.2.2, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes + Supabase webhooks
- **Database**: Supabase (PostgreSQL)
- **Real-time Communication**: Agora.io
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Deployment**: Vercel

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Agora.io account
- Vercel account (for deployment)

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Agora
NEXT_PUBLIC_AGORA_APP_ID=your-agora-app-id
AGORA_APP_CERTIFICATE=your-agora-app-certificate
AGORA_CUSTOMER_ID=your-agora-customer-id
AGORA_CUSTOMER_SECRET=your-agora-customer-secret

# OpenAI
OPENAI_API_KEY=your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1

# Agora Cloud Recording - e.g. Amazon S3
STORAGE_VENDOR=your-storage-vendor
STORAGE_REGION=your-storage-region
STORAGE_BUCKET=your-storage-bucket
STORAGE_ACCESS_KEY=your-storage-access-key
STORAGE_SECRET_KEY=your-storage-secret-key

```

## Getting Started

1. **Clone the repository**

   ```bash
   git clone [repository-url]
   cd [your-project-dir]
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**

   - Copy `.env.example` to `.env.local`
   - Fill in all required environment variables

4. **Run the development server**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000) in your browser**

## Project Structure

```
.
├── .vscode
│   ├── extensions.json
│   └── settings.json
├── database
│   └── group_interaction_schema.sql
├── public
│   ├── images
│   │   ├── home-hkdse-speaking.png
│   │   └── home-hkdse-speaking2.png
│   ├── test
│   │   ├── prompt1.txt
│   │   ├── prompt2.txt
│   │   ├── rubric.txt
│   │   ├── transcript1.txt
│   │   └── transcript2.txt
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── scripts
│   └── test-webhooks.ts
├── src
│   ├── app
│   │   ├── api
│   │   │   ├── agora
│   │   │   │   ├── stop-recording
│   │   │   │   │   └── route.ts
│   │   │   │   ├── token
│   │   │   │   │   └── route.ts
│   │   │   │   ├── transcription
│   │   │   │   │   ├── builder-token
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── start
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── status
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── stop
│   │   │   │   │       └── route.ts
│   │   │   │   └── update-status
│   │   │   │       └── route.ts
│   │   │   ├── check-key
│   │   │   │   └── route.ts
│   │   │   ├── evaluate
│   │   │   │   └── trigger
│   │   │   │       └── route.ts
│   │   │   ├── session
│   │   │   │   ├── create
│   │   │   │   │   └── route.ts
│   │   │   │   ├── expire
│   │   │   │   │   └── route.ts
│   │   │   │   ├── mark-ready
│   │   │   │   │   └── route.ts
│   │   │   │   └── status
│   │   │   │       └── route.ts
│   │   │   ├── webhook
│   │   │   │   ├── evaluate
│   │   │   │   │   └── route.ts
│   │   │   │   ├── merge-transcript
│   │   │   │   │   └── route.ts
│   │   │   │   └── start-discussion
│   │   │   │       └── route.ts
│   │   │   └── whisper-transcript
│   │   │       ├── stt
│   │   │       │   └── route.ts
│   │   │       └── submit
│   │   │           └── route.ts
│   │   ├── auth
│   │   │   ├── reset-password
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── components
│   │   │   ├── CountdownDisplay.tsx
│   │   │   ├── DiscussionClient.tsx
│   │   │   ├── DiscussionClientNew.tsx
│   │   │   └── NavBar.tsx
│   │   ├── dashboard
│   │   │   ├── results
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── hooks
│   │   │   ├── useCountdown.ts
│   │   │   ├── useDiscussionAgora-backup.ts
│   │   │   ├── useDiscussionAgora.ts
│   │   │   └── useMediaRecorder.ts
│   │   ├── profile
│   │   │   └── page.tsx
│   │   ├── session
│   │   │   ├── create
│   │   │   │   └── page.tsx
│   │   │   ├── discussion
│   │   │   │   └── page.tsx
│   │   │   ├── discussion-room
│   │   │   │   └── page.tsx
│   │   │   ├── evaluation-waiting
│   │   │   │   └── page.tsx
│   │   │   ├── join
│   │   │   │   └── page.tsx
│   │   │   ├── preparation
│   │   │   │   └── page.tsx
│   │   │   └── waiting-room
│   │   │       └── page.tsx
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── supabase-server.ts
│   │   └── supabase.tsx
│   ├── lib
│   │   ├── agora
│   │   │   └── cloudRecording.ts
│   │   ├── evaluate
│   │   │   └── evaluateTranscript.ts
│   │   ├── supabase
│   │   │   └── client.ts
│   │   └── transcript
│   │       └── mergeTranscript.ts
│   ├── protobuf
│   │   └── SttMessage_es6.js
│   ├── types
│   │   ├── database.types.ts
│   │   └── global.d.ts
│   ├── .DS_Store
│   └── middleware.ts
├── .DS_Store
├── .env.local
├── .gitignore
├── LICENSE
├── README.md
├── SttMessage.proto
├── SttMessage_es6.js
├── directory_structure.txt
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── route.ts
├── test.ipynb
├── test.mp3
└── tsconfig.json

56 directories, 87 files

```

## Development Workflow

### Vercel Deployment

1. Push your code to GitHub
2. Import your repository in Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy!

### Manual Deployment

```bash
npm run build
npm start
```

## Testing

```bash
# Run unit tests
npm run test

# Run end-to-end tests
npm run test:e2e

# Run linting
npm run lint
```

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Session Endpoints

- `POST /api/session/create` - Create a new session
- `POST /api/session/join` - Join an existing session
- `POST /api/session/mark-ready` - Mark user as ready
- `POST /api/session/leave` - Leave a session

### Discussion Endpoints

- `POST /api/discussion/start` - Start a discussion
- `POST /api/discussion/stop` - Stop a discussion
- `POST /api/discussion/transcript` - Submit discussion transcript

## Security Considerations

- All API routes are protected with authentication
- Sensitive data is encrypted
- Environment variables are used for secrets

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

```

```
