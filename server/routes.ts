import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import {
  insertResumeSchema,
  insertAnalysisSchema,
  insertChatMessageSchema
} from "@shared/schema";
import path from "path";
import * as fs from "fs";
import axios from "axios";
import * as childProcess from 'child_process';

// Job scraper API URL
const JOB_SCRAPER_API_URL = "http://localhost:8000";

// Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSyDTze4lSGgYXsPGacvZ3tDbOSvRUheiEdQ");
const genModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + "-" + uniqueSuffix + ext);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".pdf", ".docx"];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and DOCX files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Start the job scraper in the background
  try {
    // First check if the job scraper API is already running
    console.log("Checking if job scraper API is already running...");

    axios.get(`${JOB_SCRAPER_API_URL}`, { timeout: 2000 })
      .then(response => {
        if (response.status === 200) {
          console.log("Job scraper API is already running, no need to start a new instance");
        }
      })
      .catch(() => {
        console.log("Job scraper API is not running, starting a new instance...");

        // Start the job scraper process
        const jobScraperProcess = childProcess.spawn('py', ['server/job_scraper.py'], {
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe']
        });

        jobScraperProcess.stdout.on('data', (data: Buffer) => {
          console.log(`Job Scraper: ${data.toString().trim()}`);
        });

        jobScraperProcess.stderr.on('data', (data: Buffer) => {
          const errorMsg = data.toString().trim();
          console.error(`Job Scraper Error: ${errorMsg}`);

          // If the error is about the port already being in use, we can assume the service is already running
          if (errorMsg.includes('10048') || errorMsg.includes('address already in use')) {
            console.log("Port 8000 is already in use, assuming job scraper is already running");
          }
        });

        jobScraperProcess.on('close', (code: number) => {
          if (code === 0) {
            console.log("Job scraper process exited successfully");
          } else {
            console.log(`Job scraper process exited with code ${code}`);
          }
        });

        // Unref to allow the Node.js process to exit independently of the child
        jobScraperProcess.unref();

        console.log(`Started job scraper service with PID: ${jobScraperProcess.pid}`);
      });
  } catch (error) {
    console.error("Failed to start job scraper service:", error);
  }

  // API Endpoints

  // Upload resume
  app.post("/api/resume/upload", upload.single("resume"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Create resume entry in storage
      const resumeData = {
        userId: 1, // Default user ID since we don't have auth
        originalFilename: req.file.originalname,
        uploadDate: new Date().toISOString(),
        status: "pending"
      };

      const validatedData = insertResumeSchema.parse(resumeData);
      const resume = await storage.createResume(validatedData);

      // Return resume ID and status
      res.json({
        resumeId: resume.id,
        filename: resume.originalFilename,
        status: resume.status
      });

      // Begin async analysis process in the background
      // Use setTimeout to prevent blocking and ensure response is sent first
      setTimeout(() => {
        if (req.file && req.file.path) {
          console.log(`Starting background resume processing for file: ${req.file.path}`);
          processResume(req.file.path, resume.id).catch(err => {
            console.error("Background resume processing failed:", err);
          });
        } else {
          console.error("No file path available for processing");
          storage.updateResumeStatus(resume.id, "failed").catch(err => {
            console.error("Failed to update resume status:", err);
          });
        }
      }, 100);

    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to upload resume"
      });
    }
  });

  // Get resume status
  app.get("/api/resume/:id/status", async (req: Request, res: Response) => {
    try {
      const resumeId = parseInt(req.params.id);
      const resume = await storage.getResume(resumeId);

      if (!resume) {
        return res.status(404).json({ message: "Resume not found" });
      }

      res.json({
        resumeId: resume.id,
        status: resume.status
      });
    } catch (error) {
      console.error("Status error:", error);
      res.status(500).json({ message: "Failed to get resume status" });
    }
  });

  // Get resume analysis
  app.get("/api/resume/:id/analysis", async (req: Request, res: Response) => {
    try {
      const resumeId = parseInt(req.params.id);
      const analysis = await storage.getAnalysisByResumeId(resumeId);

      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      res.json(analysis);
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ message: "Failed to get analysis" });
    }
  });

  // Get chat history
  app.get("/api/resume/:id/chat", async (req: Request, res: Response) => {
    try {
      const resumeId = parseInt(req.params.id);
      const messages = await storage.getChatMessagesByResumeId(resumeId);

      res.json(messages);
    } catch (error) {
      console.error("Chat history error:", error);
      res.status(500).json({ message: "Failed to get chat history" });
    }
  });

  // Send chat message
  app.post("/api/resume/:id/chat", async (req: Request, res: Response) => {
    try {
      const resumeId = parseInt(req.params.id);
      const schema = z.object({
        content: z.string().min(1)
      });

      const { content } = schema.parse(req.body);

      // Save user message
      const userMessage = {
        resumeId,
        role: "user",
        content,
        timestamp: new Date().toISOString()
      };

      const validatedUserMessage = insertChatMessageSchema.parse(userMessage);
      await storage.createChatMessage(validatedUserMessage);

      // Get analysis for context
      const analysis = await storage.getAnalysisByResumeId(resumeId);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      // Generate AI response
      const aiResponse = await generateAIResponse(content, analysis);

      // Save AI message
      const aiMessage = {
        resumeId,
        role: "ai",
        content: aiResponse,
        timestamp: new Date().toISOString()
      };

      const validatedAiMessage = insertChatMessageSchema.parse(aiMessage);
      const savedAiMessage = await storage.createChatMessage(validatedAiMessage);

      res.json(savedAiMessage);
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to process chat message"
      });
    }
  });

  // Job search endpoint - proxy to Python API
  app.get("/api/jobs/search", async (req: Request, res: Response) => {
    try {
      const { query, location, source, limit } = req.query;

      if (!query) {
        return res.status(400).json({ message: "Query parameter is required" });
      }

      // Call the Python job scraper API
      const response = await axios.get(`${JOB_SCRAPER_API_URL}/api/jobs/search`, {
        params: {
          query,
          location,
          source,
          limit
        }
      });

      res.json(response.data);
    } catch (error) {
      console.error("Job search error:", error);
      res.status(500).json({
        message: "Failed to search jobs",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get jobs by skill - proxy to Python API
  app.get("/api/jobs/skills/:skill", async (req: Request, res: Response) => {
    try {
      const { skill } = req.params;
      const { location, limit } = req.query;

      // Call the Python job scraper API
      const response = await axios.get(`${JOB_SCRAPER_API_URL}/api/jobs/skills/${skill}`, {
        params: {
          location,
          limit
        }
      });

      res.json(response.data);
    } catch (error) {
      console.error("Jobs by skill error:", error);
      res.status(500).json({
        message: "Failed to get jobs for skill",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get job recommendations based on skills and experience level - proxy to Python API
  app.get("/api/jobs/recommendations", async (req: Request, res: Response) => {
    try {
      const { skills, experience_level, limit } = req.query;

      if (!skills) {
        return res.status(400).json({ message: "Skills parameter is required" });
      }

      // Call the Python job scraper API
      const response = await axios.get(`${JOB_SCRAPER_API_URL}/api/jobs/recommendations`, {
        params: {
          skills,
          experience_level,
          limit
        }
      });

      res.json(response.data);
    } catch (error) {
      console.error("Job recommendations error:", error);
      res.status(500).json({
        message: "Failed to get job recommendations",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Helper function to process resume
  async function processResume(filePath: string, resumeId: number) {
    // Set a timeout to ensure the process doesn't hang indefinitely
    const processingTimeout = setTimeout(async () => {
      console.error(`Resume ${resumeId} processing timed out after 2 minutes`);
      try {
        // Check current status
        const resume = await storage.getResume(resumeId);
        if (resume && resume.status === "processing") {
          // Only update if still processing
          await storage.updateResumeStatus(resumeId, "failed");

          // Create a minimal error analysis
          const errorAnalysis = {
            resumeId,
            error: "Processing timeout",
            skills: [],
            experienceLevel: "Unknown",
            marketMatchScore: 0,
            recommendations: [],
            jobRecommendations: [],
            improvements: [
              {
                type: "error",
                severity: "high",
                message: "Analysis Failed",
                details: "We encountered a timeout while analyzing your resume. Please try uploading a different file or contact support.",
                tags: ["error", "retry"]
              }
            ],
            careerPaths: [],
            completedDate: new Date().toISOString()
          };

          const validatedErrorAnalysis = insertAnalysisSchema.parse(errorAnalysis);
          await storage.createAnalysis(validatedErrorAnalysis);

          console.log(`Updated resume ${resumeId} status to failed due to timeout`);
        }
      } catch (timeoutError) {
        console.error("Error handling timeout:", timeoutError);
      }
    }, 120000); // 2 minute timeout

    try {
      console.log(`Starting resume processing for ID: ${resumeId}`);

      // Update resume status to processing
      await storage.updateResumeStatus(resumeId, "processing");
      console.log(`Updated resume ${resumeId} status to processing`);

      // Extract text from file
      console.log(`Extracting text from resume file: ${filePath}`);
      let resumeText = "";
      try {
        resumeText = await extractResumeText(filePath);

        if (!resumeText || resumeText.trim() === '') {
          throw new Error("Failed to extract text from resume - the file appears to be empty");
        }

        console.log(`Successfully extracted ${resumeText.length} characters of text from resume`);
      } catch (extractError) {
        console.error("Text extraction error:", extractError);
        resumeText = "Sample resume text for processing. Unable to extract text from the provided file.";
        console.log("Using default text for analysis due to extraction failure");
      }

      // Analyze resume with Gemini AI
      console.log("Sending resume text to Gemini AI for analysis...");
      let analysis;
      try {
        analysis = await analyzeResumeWithAI(resumeText);
        console.log("Successfully received AI analysis");
      } catch (aiError) {
        console.error("AI analysis error:", aiError);
        // Use mock analysis if AI fails
        analysis = getMockResumeAnalysis(resumeText);
        console.log("Using mock analysis due to AI failure");
      }

      // Fetch real job recommendations based on extracted skills
      try {
        console.log("Starting job recommendations fetch...");

        // Check if analysis has skills
        if (!analysis.skills || !Array.isArray(analysis.skills)) {
          console.log("No skills found in analysis, skipping job recommendations");
          // Continue with the existing job recommendations
        } else {
          // Extract top skills from analysis - use more skills for better results
          const topSkills = analysis.skills
            .filter((skill: any) => skill.proficiency > 60) // Lower threshold to get more skills
            .map((skill: any) => skill.name)
            .slice(0, 5) // Get up to 5 top skills
            .join(",");

          console.log(`Fetching job recommendations for skills: ${topSkills}`);

          if (topSkills) {
            try {
              // Add a timeout for the job scraper API call
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

              // Call the job scraper API for recommendations
              console.log(`Calling job scraper API at ${JOB_SCRAPER_API_URL}/api/jobs/recommendations`);
              const jobResponse = await axios.get(`${JOB_SCRAPER_API_URL}/api/jobs/recommendations`, {
                params: {
                  skills: topSkills,
                  experience_level: analysis.experienceLevel,
                  limit: 10 // Get more jobs for better filtering
                },
                timeout: 15000, // 15 second timeout
                signal: controller.signal
              }).finally(() => clearTimeout(timeoutId));

              if (jobResponse.data && jobResponse.data.jobs && jobResponse.data.jobs.length > 0) {
                // Process the scraped jobs to match the expected format
                const realJobs = jobResponse.data.jobs.map((job: any) => {
                  // Extract skills from job title and summary
                  const jobText = `${job.title} ${job.summary || ''}`.toLowerCase();
                  const extractedSkills = analysis.skills
                    .filter((skill: any) => jobText.includes(skill.name.toLowerCase()))
                    .map((skill: any) => skill.name)
                    .slice(0, 3);

                  // If no skills were extracted, use some from the top skills
                  const jobSkills = extractedSkills.length > 0
                    ? extractedSkills
                    : topSkills.split(',').slice(0, 3);

                  // Calculate a realistic match score based on skill overlap
                  const skillsInJob = analysis.skills.filter((skill: any) =>
                    jobText.includes(skill.name.toLowerCase())
                  ).length;

                  const totalSkills = analysis.skills.length;
                  const matchScore = Math.min(
                    95, // Cap at 95%
                    Math.max(
                      70, // Minimum 70%
                      Math.floor((skillsInJob / Math.min(totalSkills, 5)) * 100)
                    )
                  );

                  return {
                    title: job.title,
                    company: job.company,
                    match: matchScore,
                    skills: jobSkills,
                    location: job.location,
                    salary: job.salary !== "Not specified" ? job.salary : "Market Rate",
                    type: job.type !== "Not specified" ? job.type : "Full-time",
                    url: job.url || "", // Add the job URL for direct linking
                    summary: job.summary || "" // Add the job summary for the description
                  };
                });

                console.log(`Found ${realJobs.length} real job recommendations`);

                // Sort by match score (highest first)
                realJobs.sort((a: any, b: any) => b.match - a.match);

                // Replace AI-generated job recommendations with real ones from our scraper
                analysis.jobRecommendations = realJobs;

                // Add a source field to indicate these are real jobs
                analysis.jobSource = "real";
              } else {
                console.log("No job recommendations found from scraper API");
              }
            } catch (apiError: any) {
              console.error(`Job scraper API error: ${apiError.message}`);
              console.log("Continuing with AI-generated recommendations");
            }
          } else {
            console.log("No high-proficiency skills found for job recommendations");
          }
        }
      } catch (jobError: any) {
        console.error(`Error in job recommendations process: ${jobError.message}`);
        // Continuing with AI-generated recommendations if job scraping fails
      }

      // Save analysis to storage
      const analysisData = {
        resumeId,
        ...analysis,
        completedDate: new Date().toISOString()
      };

      const validatedAnalysis = insertAnalysisSchema.parse(analysisData);
      await storage.createAnalysis(validatedAnalysis);

      // Update resume status to completed
      await storage.updateResumeStatus(resumeId, "completed");
      console.log(`Resume analysis completed successfully for resumeId: ${resumeId}`);

    } catch (error) {
      console.error("Resume processing error:", error instanceof Error ? error.message : String(error));
      if (error instanceof Error) {
        console.error(error.stack); // Log stack trace for debugging
      }

      // Update resume status to failed
      await storage.updateResumeStatus(resumeId, "failed");

      // Try to create a minimal error report as analysis data
      try {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorAnalysis = {
          resumeId,
          error: errorMessage,
          skills: [],
          experienceLevel: "Unknown",
          marketMatchScore: 0,
          recommendations: [],
          jobRecommendations: [],
          improvements: [
            {
              type: "error",
              severity: "high",
              message: "Analysis Failed",
              details: `We encountered an error analyzing your resume: ${errorMessage}. Please try uploading a different file or contact support.`,
              tags: ["error", "retry"]
            }
          ],
          careerPaths: [],
          completedDate: new Date().toISOString()
        };

        const validatedErrorAnalysis = insertAnalysisSchema.parse(errorAnalysis);
        await storage.createAnalysis(validatedErrorAnalysis);
      } catch (secondaryError) {
        console.error("Failed to create error analysis:", secondaryError);
      }
    } finally {
      // Clear the timeout to prevent unnecessary status updates
      clearTimeout(processingTimeout);
    }
  }

  // Helper function to extract text from resume files (PDF or DOCX)
  async function extractResumeText(filePath: string): Promise<string> {
    try {
      console.log(`Starting text extraction from file: ${filePath}`);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error(`File does not exist: ${filePath}`);
        return "Sample resume text for processing";
      }

      const fileExtension = path.extname(filePath).toLowerCase();
      console.log(`File extension detected: ${fileExtension}`);

      if (fileExtension === '.pdf') {
        try {
          console.log("Extracting text from PDF file...");
          // Extract text from PDF using pdf-parse
          const pdfParse = require('pdf-parse');
          const dataBuffer = fs.readFileSync(filePath);

          // Add a timeout for PDF parsing
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("PDF parsing timed out after 30 seconds")), 30000);
          });

          const parsePromise = pdfParse(dataBuffer);
          const pdfData = await Promise.race([parsePromise, timeoutPromise]) as any;

          console.log(`Successfully extracted ${pdfData.text.length} characters from PDF`);
          return pdfData.text || 'Empty PDF document';
        } catch (pdfError: any) {
          console.error("PDF parsing error:", pdfError);
          return "Failed to parse PDF document. Please try uploading a different file.";
        }
      }
      else if (fileExtension === '.docx') {
        try {
          console.log("Extracting text from DOCX file...");
          // Extract text from DOCX using mammoth
          const mammoth = require('mammoth');

          // Add a timeout for DOCX parsing
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("DOCX parsing timed out after 30 seconds")), 30000);
          });

          const parsePromise = mammoth.extractRawText({ path: filePath });
          const result = await Promise.race([parsePromise, timeoutPromise]) as any;

          console.log(`Successfully extracted ${result.value.length} characters from DOCX`);
          return result.value || 'Empty DOCX document';
        } catch (docxError: any) {
          console.error("DOCX parsing error:", docxError);
          return "Failed to parse DOCX document. Please try uploading a different file.";
        }
      }
      else {
        console.error(`Unsupported file format: ${fileExtension}`);
        return "Unsupported file format. Please upload a PDF or DOCX file.";
      }
    } catch (error: any) {
      console.error("Text extraction error:", error);
      // Return a default string instead of throwing an error
      return "Error extracting text from resume. Please try uploading a different file.";
    }
  }

  // Helper function to analyze resume with Gemini AI
  async function analyzeResumeWithAI(resumeText: string) {
    try {
      // If we have a valid Gemini API key, use the actual API
      if (genModel) {
        const prompt = `You are an expert resume analyzer, career advisor, and job market specialist with extensive experience across multiple industries.

TASK:
Perform a comprehensive analysis of the following resume text. Extract ONLY factual information from the resume - do not make up or guess any information that is not present. Your analysis must be accurate, detailed, and personalized to the individual's actual experience and skills.

Resume Text:
${resumeText}

INSTRUCTIONS:
1. Carefully identify all ACTUAL skills mentioned in the resume - include both technical and soft skills.
2. Determine the experience level based on years of experience, job titles, and responsibilities.
3. Assess market match by comparing extracted skills with current job market demands.
4. Identify actual skill gaps by comparing the resume with industry standards.
5. Recommend improvements based ONLY on what is missing or could be enhanced in the resume.
6. Provide specific job recommendations matching the person's actual skill set.
7. Suggest viable career paths based on the individual's demonstrated experience.
8. DO NOT invent skills, experiences, or qualifications not clearly indicated in the resume.
9. For all skills, assign a realistic icon name that can be used in the UI.

FORMAT:
Return ONLY a valid JSON object (no additional text before or after) with the following structure:
{
  "skills": [
    {
      "name": "Extracted Skill Name (be specific)",
      "level": "Beginner/Intermediate/Advanced/Expert (based on context)",
      "proficiency": 0-100,
      "category": "Specific Category (Programming/Database/AI/Analysis/Communication/Leadership/etc)",
      "icon": "icon-name (code, database, chart-line, brain, server, etc)"
    }
  ],
  "experienceLevel": "Junior/Mid/Senior/Director/Executive (based on actual experience)",
  "marketMatchScore": 0-100,
  "recommendations": [
    {
      "skill": "Recommended Skill Name",
      "importance": 0-100,
      "description": "Specific reason why this skill is important for their career goals"
    }
  ],
  "jobRecommendations": [
    {
      "title": "Specific Job Title",
      "company": "Relevant Company Type or Industry",
      "match": 0-100,
      "skills": ["Required Skill 1", "Required Skill 2"],
      "location": "Location Type (Remote/Hybrid/On-site/Various)",
      "salary": "Current Market Range",
      "type": "Full-time/Part-time/Contract/Freelance"
    }
  ],
  "improvements": [
    {
      "type": "suggestion/missing/strength",
      "severity": "low/medium/high",
      "message": "Clear, actionable improvement",
      "details": "Detailed explanation with specific examples",
      "tags": ["Relevant Tags"]
    }
  ],
  "careerPaths": [
    {
      "name": "Specific Career Path",
      "recommended": true/false,
      "roles": ["Specific Role 1", "Specific Role 2"],
      "requiredSkills": ["Required Skill 1", "Required Skill 2"]
    }
  ]
}`;

        try {
          // Add a timeout for the Gemini API call
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Gemini API call timed out after 30 seconds")), 30000);
          });

          const resultPromise = genModel.generateContent(prompt);
          const result = await Promise.race([resultPromise, timeoutPromise]) as any;
          const response = await result.response;
          const content = response.text();

          if (!content || content.trim() === '') {
            throw new Error("Empty response from Gemini AI");
          }

          // Extract JSON from response if it's surrounded by markdown code blocks
          let jsonStr = content;
          if (content.includes('```json')) {
            jsonStr = content.split('```json')[1].split('```')[0].trim();
          } else if (content.includes('```')) {
            jsonStr = content.split('```')[1].split('```')[0].trim();
          }

          try {
            const parsedResult = JSON.parse(jsonStr);
            // Verify we have at least some required fields
            if (!parsedResult.skills || !Array.isArray(parsedResult.skills) || parsedResult.skills.length === 0) {
              throw new Error("Invalid response: missing skills data");
            }
            return parsedResult;
          } catch (parseError: any) {
            console.error("JSON parse error:", parseError);
            throw new Error(`Failed to parse AI response: ${parseError.message}`);
          }
        } catch (error: any) {
          console.error("Gemini API error:", error);
          console.log("Falling back to mock implementation due to API error");
          return getMockResumeAnalysis(resumeText);
        }
      } else {
        // Use mock implementation
        console.log("Using mock implementation for resume analysis");
        return getMockResumeAnalysis(resumeText);
      }
    } catch (error: any) {
      console.error("Resume analysis error:", error);
      throw new Error(`Resume analysis failed: ${error.message}`);
    }
  }

  // Mock implementation for resume analysis
  function getMockResumeAnalysis(resumeText: string) {
    console.log(`Generating mock analysis for resume text (${resumeText.length} characters)`);

    // Extract some basic information from the resume text to make the mock data somewhat relevant
    const programmingLanguages = ["JavaScript", "TypeScript", "Python", "Java", "C#", "C++", "Ruby", "Go"];
    const frameworks = ["React", "Angular", "Vue", "Node.js", "Express", "Django", "Flask", "Spring", "ASP.NET"];
    const databases = ["SQL", "MySQL", "PostgreSQL", "MongoDB", "Oracle", "SQLite", "Redis", "Cassandra"];
    const cloudPlatforms = ["AWS", "Azure", "Google Cloud", "Heroku", "DigitalOcean", "Netlify", "Vercel"];
    const tools = ["Git", "Docker", "Kubernetes", "Jenkins", "CircleCI", "Travis CI", "Jira", "Confluence"];

    // Find skills in the resume text
    const foundSkills = [];
    const allSkills = [...programmingLanguages, ...frameworks, ...databases, ...cloudPlatforms, ...tools];

    for (const skill of allSkills) {
      if (resumeText.toLowerCase().includes(skill.toLowerCase())) {
        foundSkills.push(skill);
      }
    }

    // If no skills were found, add some default ones
    if (foundSkills.length === 0) {
      foundSkills.push("JavaScript", "React", "Node.js", "SQL");
    }

    // Generate mock skills data
    const skills = foundSkills.map(skill => {
      const categories = {
        "JavaScript": "Programming",
        "TypeScript": "Programming",
        "Python": "Programming",
        "Java": "Programming",
        "C#": "Programming",
        "C++": "Programming",
        "Ruby": "Programming",
        "Go": "Programming",
        "React": "Frontend",
        "Angular": "Frontend",
        "Vue": "Frontend",
        "Node.js": "Backend",
        "Express": "Backend",
        "Django": "Backend",
        "Flask": "Backend",
        "Spring": "Backend",
        "ASP.NET": "Backend",
        "SQL": "Database",
        "MySQL": "Database",
        "PostgreSQL": "Database",
        "MongoDB": "Database",
        "Oracle": "Database",
        "SQLite": "Database",
        "Redis": "Database",
        "Cassandra": "Database",
        "AWS": "Cloud",
        "Azure": "Cloud",
        "Google Cloud": "Cloud",
        "Heroku": "Cloud",
        "DigitalOcean": "Cloud",
        "Netlify": "Cloud",
        "Vercel": "Cloud",
        "Git": "Tools",
        "Docker": "DevOps",
        "Kubernetes": "DevOps",
        "Jenkins": "DevOps",
        "CircleCI": "DevOps",
        "Travis CI": "DevOps",
        "Jira": "Tools",
        "Confluence": "Tools"
      };

      const icons = {
        "Programming": "code",
        "Frontend": "layout",
        "Backend": "server",
        "Database": "database",
        "Cloud": "cloud",
        "DevOps": "settings",
        "Tools": "tool"
      };

      const category = categories[skill as keyof typeof categories] || "Other";
      const icon = icons[category as keyof typeof icons] || "star";

      return {
        name: skill,
        level: ["Beginner", "Intermediate", "Advanced", "Expert"][Math.floor(Math.random() * 4)],
        proficiency: Math.floor(Math.random() * 40) + 60, // 60-100
        category,
        icon
      };
    });

    // Generate mock recommendations
    const recommendations = [
      {
        skill: "Docker",
        importance: 85,
        description: "Containerization is essential for modern deployment workflows and ensures consistency across environments."
      },
      {
        skill: "TypeScript",
        importance: 90,
        description: "Adding static typing to your JavaScript projects will improve code quality and reduce runtime errors."
      },
      {
        skill: "CI/CD",
        importance: 80,
        description: "Implementing automated testing and deployment pipelines will increase productivity and code quality."
      }
    ];

    // Generate mock job recommendations
    const jobRecommendations = [
      {
        title: "Full Stack Developer",
        company: "Tech Startup",
        match: 92,
        skills: ["JavaScript", "React", "Node.js"],
        location: "Remote",
        salary: "$90,000 - $120,000",
        type: "Full-time"
      },
      {
        title: "Frontend Engineer",
        company: "E-commerce Company",
        match: 88,
        skills: ["JavaScript", "React", "CSS"],
        location: "Hybrid",
        salary: "$85,000 - $110,000",
        type: "Full-time"
      },
      {
        title: "Backend Developer",
        company: "Financial Services",
        match: 85,
        skills: ["Node.js", "Express", "SQL"],
        location: "On-site",
        salary: "$95,000 - $125,000",
        type: "Full-time"
      }
    ];

    // Generate mock improvements
    const improvements = [
      {
        type: "suggestion",
        severity: "medium",
        message: "Add more quantifiable achievements",
        details: "Include specific metrics and results from your past work to demonstrate your impact.",
        tags: ["Resume", "Achievements"]
      },
      {
        type: "missing",
        severity: "high",
        message: "Include a professional summary",
        details: "Add a concise professional summary at the top of your resume to highlight your key qualifications and career goals.",
        tags: ["Resume", "Structure"]
      },
      {
        type: "strength",
        severity: "low",
        message: "Strong technical skills section",
        details: "Your technical skills are well organized and comprehensive. Consider grouping them by category for even better readability.",
        tags: ["Skills", "Organization"]
      }
    ];

    // Generate mock career paths
    const careerPaths = [
      {
        name: "Full Stack Development",
        recommended: true,
        roles: ["Junior Full Stack Developer", "Full Stack Developer", "Senior Full Stack Developer", "Lead Developer"],
        requiredSkills: ["JavaScript", "React", "Node.js", "SQL"]
      },
      {
        name: "Frontend Specialization",
        recommended: true,
        roles: ["Frontend Developer", "UI Developer", "Senior Frontend Engineer", "UI/UX Lead"],
        requiredSkills: ["JavaScript", "React", "CSS", "HTML"]
      },
      {
        name: "Backend Specialization",
        recommended: false,
        roles: ["Backend Developer", "API Developer", "Senior Backend Engineer", "Backend Architect"],
        requiredSkills: ["Node.js", "Express", "SQL", "API Design"]
      }
    ];

    return {
      skills,
      experienceLevel: "Mid",
      marketMatchScore: 78,
      recommendations,
      jobRecommendations,
      improvements,
      careerPaths
    };
  }

  // Generate AI response for chat using Gemini API
  async function generateAIResponse(userMessage: string, analysis: any) {
    try {
      console.log("Generating AI response for chat message...");

      // If no valid Gemini model is available, return a default response
      if (!genModel) {
        console.log("No valid Gemini model available, returning default response");
        return "Based on your resume analysis, I can provide some insights. Your skills show potential in the job market. Consider focusing on developing the skills highlighted in your analysis to improve your career prospects. Is there anything specific about your resume or career path you'd like to know more about?";
      }

      const prompt = `You are CareerCoach AI, an advanced career advisor with deep expertise in career development, job markets, skills assessment, and professional growth strategies.

CONTEXT:
You're having a conversation with someone who has uploaded their resume for analysis. You have access to the complete analysis of their resume, including their skills, experience level, market match score, recommended skills, job recommendations, suggested improvements, and potential career paths.

RESUME ANALYSIS DATA:
${JSON.stringify(analysis, null, 2)}

CURRENT USER QUESTION:
${userMessage}

INSTRUCTIONS:
1. Provide personalized, specific advice based ONLY on the resume analysis data.
2. Focus on actionable guidance that directly addresses the user's question.
3. Be conversational, supportive, and encouraging, but also honest and realistic.
4. When discussing skills, opportunities, or improvements, reference specific items from their resume analysis.
5. If asked about skills or jobs not found in the analysis, explain that you can only provide insights based on what's in their resume.
6. Avoid generic career advice that doesn't relate to their specific situation.
7. Keep responses focused and concise (4-6 paragraphs maximum) but thorough and information-rich.
8. Use natural, professional language that's easy to understand.

RESPONSE FORMAT:
- Start with a direct answer to their question
- Provide specific examples or references from their resume analysis
- Include actionable next steps or recommendations
- End with an encouraging note or follow-up question`;

      try {
        // Add a timeout for the Gemini API call
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Gemini API call timed out after 15 seconds")), 15000);
        });

        console.log("Sending request to Gemini API with timeout...");
        const resultPromise = genModel.generateContent(prompt);
        const result = await Promise.race([resultPromise, timeoutPromise]) as any;

        console.log("Received response from Gemini API");
        const response = result.response;
        const content = response.text();

        return content || "I apologize, but I couldn't generate a response. Please try asking another question about your resume or career goals.";
      } catch (apiError: any) {
        console.error(`Gemini API error: ${apiError.message}`);
        return "I apologize, but I'm having trouble analyzing your question at the moment. Based on your resume analysis, I can see you have several skills that are valuable in today's job market. Could you please try asking a more specific question about your skills or career options?";
      }
    } catch (error: any) {
      console.error(`Chat response error: ${error.message}`);
      return "I apologize, but I'm having trouble analyzing your question at the moment. Could you please try asking again in a different way?";
    }
  }



  const httpServer = createServer(app);
  return httpServer;
}
