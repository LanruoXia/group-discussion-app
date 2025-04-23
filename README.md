# HKDSE English Group Interaction Practice Platform

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

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
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

## Prepration

Make sure that you have the environment variables below.

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
OPENAI_API_KEY
OPENAI_BASE_URL
NEXT_PUBLIC_AGORA_APP_ID
SUPABASE_SERVICE_ROLE_KEY
AGORA_CUSTOMER_ID
AGORA_CUSTOMER_SECRET

Also, install dependencies by

```
npm install
```

## Getting Started

1. **Clone the repository**

<<<<<<< HEAD

````bash
npm run dev
=======
   ```bash
   git clone [repository-url]
   cd [your-project-dir]
````

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
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── components/        # Reusable components
│   ├── hooks/             # Custom React hooks
│   ├── session/           # Session-related pages
│   └── lib/               # Utility functions
├── public/                # Static assets
└── types/                 # TypeScript type definitions
>>>>>>> 39e6b35 (docs: update README)
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
- Regular security audits are performed

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments
