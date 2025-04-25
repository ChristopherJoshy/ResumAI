import { 
  User, InsertUser, 
  Resume, InsertResume, 
  Analysis, InsertAnalysis,
  ChatMessage, InsertChatMessage
} from "@shared/schema";

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Resume methods
  getResume(id: number): Promise<Resume | undefined>;
  getResumesByUserId(userId: number): Promise<Resume[]>;
  createResume(resume: InsertResume): Promise<Resume>;
  updateResumeStatus(id: number, status: string): Promise<Resume | undefined>;

  // Analysis methods
  getAnalysis(id: number): Promise<Analysis | undefined>;
  getAnalysisByResumeId(resumeId: number): Promise<Analysis | undefined>;
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;

  // Chat methods
  getChatMessagesByResumeId(resumeId: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private resumes: Map<number, Resume>;
  private analyses: Map<number, Analysis>;
  private chatMessages: Map<number, ChatMessage>;
  private currentUserId: number;
  private currentResumeId: number;
  private currentAnalysisId: number;
  private currentChatMessageId: number;

  constructor() {
    this.users = new Map();
    this.resumes = new Map();
    this.analyses = new Map();
    this.chatMessages = new Map();
    this.currentUserId = 1;
    this.currentResumeId = 1;
    this.currentAnalysisId = 1;
    this.currentChatMessageId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Resume methods
  async getResume(id: number): Promise<Resume | undefined> {
    return this.resumes.get(id);
  }

  async getResumesByUserId(userId: number): Promise<Resume[]> {
    return Array.from(this.resumes.values()).filter(
      (resume) => resume.userId === userId,
    );
  }

  async createResume(insertResume: InsertResume): Promise<Resume> {
    const id = this.currentResumeId++;
    const resume: Resume = { ...insertResume, id };
    this.resumes.set(id, resume);
    return resume;
  }

  async updateResumeStatus(id: number, status: string): Promise<Resume | undefined> {
    const resume = this.resumes.get(id);
    if (!resume) return undefined;
    
    const updatedResume = { ...resume, status };
    this.resumes.set(id, updatedResume);
    return updatedResume;
  }

  // Analysis methods
  async getAnalysis(id: number): Promise<Analysis | undefined> {
    return this.analyses.get(id);
  }

  async getAnalysisByResumeId(resumeId: number): Promise<Analysis | undefined> {
    return Array.from(this.analyses.values()).find(
      (analysis) => analysis.resumeId === resumeId,
    );
  }

  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
    const id = this.currentAnalysisId++;
    const analysis: Analysis = { ...insertAnalysis, id };
    this.analyses.set(id, analysis);
    return analysis;
  }

  // Chat methods
  async getChatMessagesByResumeId(resumeId: number): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter((message) => message.resumeId === resumeId)
      .sort((a, b) => a.id - b.id);
  }

  async createChatMessage(insertChatMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.currentChatMessageId++;
    const chatMessage: ChatMessage = { ...insertChatMessage, id };
    this.chatMessages.set(id, chatMessage);
    return chatMessage;
  }
}

export const storage = new MemStorage();
