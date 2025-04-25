import { apiRequest } from "./queryClient";

export async function sendChatMessage(resumeId: number, content: string) {
  const response = await apiRequest("POST", `/api/resume/${resumeId}/chat`, { content });
  return response.json();
}

export async function fetchChatHistory(resumeId: number) {
  const response = await apiRequest("GET", `/api/resume/${resumeId}/chat`);
  return response.json();
}
