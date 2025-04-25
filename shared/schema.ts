import { pgTable, text, serial, integer, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Resume schema
export const resumes = pgTable("resumes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  originalFilename: text("original_filename").notNull(),
  uploadDate: text("upload_date").notNull(),
  status: text("status").notNull().default("pending"),
});

export const insertResumeSchema = createInsertSchema(resumes).pick({
  userId: true,
  originalFilename: true,
  uploadDate: true,
  status: true,
});

export type InsertResume = z.infer<typeof insertResumeSchema>;
export type Resume = typeof resumes.$inferSelect;

// Analysis schema
export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  resumeId: integer("resume_id").references(() => resumes.id),
  skills: json("skills").notNull(),
  experienceLevel: text("experience_level").notNull(),
  marketMatchScore: integer("market_match_score").notNull(),
  recommendations: json("recommendations").notNull(),
  jobRecommendations: json("job_recommendations").notNull(),
  improvements: json("improvements").notNull(),
  careerPaths: json("career_paths").notNull(),
  completedDate: text("completed_date").notNull(),
});

export const insertAnalysisSchema = createInsertSchema(analyses).pick({
  resumeId: true,
  skills: true,
  experienceLevel: true,
  marketMatchScore: true,
  recommendations: true,
  jobRecommendations: true,
  improvements: true,
  careerPaths: true,
  completedDate: true,
});

export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analyses.$inferSelect;

// Chat messages schema
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  resumeId: integer("resume_id").references(() => resumes.id),
  role: text("role").notNull(), // 'user' or 'ai'
  content: text("content").notNull(),
  timestamp: text("timestamp").notNull(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  resumeId: true,
  role: true,
  content: true,
  timestamp: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// Define API response types for frontend
export type ResumeUploadResponse = {
  resumeId: number;
  filename: string;
  status: string;
};

export type AnalysisResponse = {
  id: number;
  skills: {
    name: string;
    level: string;
    proficiency: number;
    category: string;
    icon: string;
  }[];
  experienceLevel: string;
  marketMatchScore: number;
  recommendations: {
    skill: string;
    importance: number;
    description: string;
  }[];
  jobRecommendations: {
    title: string;
    company: string;
    match: number;
    skills: string[];
    location: string;
    salary: string;
    type: string;
  }[];
  improvements: {
    type: string;
    severity: string;
    message: string;
    details?: string;
    tags?: string[];
  }[];
  careerPaths: {
    name: string;
    recommended: boolean;
    roles: string[];
    requiredSkills: string[];
  }[];
};

export type ChatMessageResponse = {
  role: string;
  content: string;
  timestamp: string;
};
