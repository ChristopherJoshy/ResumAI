import { apiRequest } from "./queryClient";
import { ChatMessageResponse } from "@shared/schema";

export async function sendChatMessage(resumeId: number, content: string): Promise<ChatMessageResponse> {
  const response = await apiRequest("POST", `/api/resume/${resumeId}/chat`, { content });
  return response.json();
}

export async function fetchChatHistory(resumeId: number): Promise<ChatMessageResponse[]> {
  const response = await apiRequest("GET", `/api/resume/${resumeId}/chat`);
  return response.json();
}