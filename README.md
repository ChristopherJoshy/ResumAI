# CareerCompass

CareerCompass is an AI-powered resume analysis and career guidance tool that helps job seekers optimize their resumes and discover relevant job opportunities. The application analyzes resumes, extracts skills, provides personalized improvement suggestions, and recommends job opportunities based on the user's profile.

## Features

- **Resume Analysis**: Upload your resume (PDF or DOCX) for AI-powered analysis
- **Skills Extraction**: Automatically identify technical and soft skills from your resume
- **Market Match Assessment**: Compare your skills with current job market demands
- **Personalized Recommendations**: Get tailored suggestions to improve your resume
- **Real-Time Job Recommendations**: Discover job opportunities that match your skills and experience
- **Career Path Guidance**: Explore potential career trajectories based on your experience
- **AI Career Coach**: Chat with an AI career advisor for personalized guidance

## Technology Stack

### Frontend
- React 18
- TypeScript
- TailwindCSS
- Radix UI Components
- React Query
- Wouter (for routing)

### Backend
- Node.js with Express
- TypeScript
- Drizzle ORM with PostgreSQL (NeonDB)
- Google Generative AI (Gemini)
- Python for job scraping

### Job Scraper
- Python with FastAPI
- BeautifulSoup for web scraping
- Caching mechanism for improved performance

## System Architecture

The application consists of three main components:

1. **React Frontend**: Provides the user interface for uploading resumes, viewing analysis results, and interacting with the AI career coach.

2. **Node.js Backend**: Handles resume processing, AI analysis, and serves as the API for the frontend.

3. **Python Job Scraper**: A separate microservice that scrapes job listings from various sources and provides job recommendations based on skills.

## Prerequisites

Before setting up the project, ensure you have the following installed:

- Node.js (v18 or higher)
- Python (v3.8 or higher)
- PostgreSQL database (or use NeonDB cloud service)
- Google Generative AI API key (for Gemini)

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/ChristopherJoshy/ResumAI.git
cd CareerCompass
```

### 2. Install Node.js Dependencies

```bash
npm install
```

### 3. Install Python Dependencies

```bash
pip install -r requirements.txt
# or using uv
uv pip install -r requirements.txt
```

### 4. Set Up Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/careercompass

# Google Generative AI
GEMINI_API_KEY=your_gemini_api_key

# Server
PORT=5000
NODE_ENV=development

# Session
SESSION_SECRET=your_session_secret
```

### 5. Set Up the Database

```bash
npm run db:push
```

This will create the necessary tables in your PostgreSQL database.

### 6. Start the Development Server

```bash
npm run dev
```

This will start both the Node.js backend and the React frontend in development mode.

### 7. Start the Job Scraper

In a separate terminal:

```bash
python server/job_scraper.py
```

This will start the job scraper API on port 8000.

## Usage

1. **Upload Resume**: Navigate to the home page and upload your resume (PDF or DOCX format).

2. **View Analysis**: After processing, you'll see a comprehensive analysis of your resume, including:
   - Extracted skills and proficiency levels
   - Market match score
   - Improvement suggestions
   - Job recommendations

3. **Explore Job Recommendations**: Browse through job opportunities that match your skills and experience. Click "Apply Now" to visit the job posting or "View Full Description" to see more details.

4. **Chat with AI Career Coach**: Get personalized career advice by chatting with the AI career coach.

## Job Scraper API

The job scraper is a separate microservice that provides real-time job recommendations based on skills. It scrapes job listings from various sources including LinkedIn and Indeed.

### API Endpoints

- `GET /api/jobs/recommendations?skills=JavaScript,React&experience_level=Mid&limit=5`
  - Get job recommendations based on skills and experience level

- `GET /api/jobs/skills/JavaScript?limit=10`
  - Get job listings for a specific skill

### Caching Mechanism

The job scraper implements a caching mechanism to improve performance and reduce the number of web scraping requests. Job recommendations are cached for 30 minutes, and a background process refreshes the cache before it expires.

## Deployment

### Frontend and Backend

1. Build the application:

```bash
npm run build
```

2. Start the production server:

```bash
npm start
```

### Job Scraper

1. Deploy the job scraper as a separate service:

```bash
python server/job_scraper.py
```

Consider using a process manager like PM2 or a containerization solution like Docker for production deployments.

## Project Structure

```
CareerCompass/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions
│   │   ├── pages/          # Page components
│   │   ├── App.tsx         # Main application component
│   │   └── main.tsx        # Entry point
│   └── index.html          # HTML template
├── server/                 # Backend Node.js application
│   ├── job_scraper.py      # Python job scraper
│   ├── routes.ts           # Express routes
│   ├── storage.ts          # Database operations
│   └── index.ts            # Entry point
├── shared/                 # Shared code between frontend and backend
│   └── schema.ts           # Zod schemas for validation
├── uploads/                # Directory for uploaded resumes
├── package.json            # Node.js dependencies and scripts
└── README.md               # Project documentation
```

## Error Handling

The application includes robust error handling to ensure a smooth user experience:

- **Resume Processing**: If the resume processing fails, the application will provide a fallback analysis.
- **Job Scraping**: If job scraping fails, the application will use cached results or provide default job recommendations.
- **AI Analysis**: If the AI analysis fails, the application will use a mock analysis to ensure the user still gets results.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Shadcn UI](https://ui.shadcn.com/) for the beautiful UI components
- [Google Generative AI](https://ai.google.dev/) for the Gemini API
- [FastAPI](https://fastapi.tiangolo.com/) for the Python API framework
- [BeautifulSoup](https://www.crummy.com/software/BeautifulSoup/) for web scraping capabilities






**Also Db feature are currently not implemented**