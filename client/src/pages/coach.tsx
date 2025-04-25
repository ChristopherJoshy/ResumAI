import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StepIndicator from "@/components/ui/step-indicator";
import Chat from "@/components/ui/chat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sendChatMessage, fetchChatHistory } from "@/lib/gemini";
import { ChatMessageResponse } from "@shared/schema";

interface CoachPageProps {
  resumeId: number;
  currentStep: number;
}

const CoachPage: React.FC<CoachPageProps> = ({ resumeId, currentStep }) => {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  
  const steps = [
    { number: 1, label: "Upload" },
    { number: 2, label: "Analysis" },
    { number: 3, label: "Results" },
    { number: 4, label: "AI Coach" },
  ];

  const suggestedQuestions = [
    "What companies should I target with my skills?",
    "How can I improve my resume for data science roles?",
    "What certifications are most valuable for my career path?",
  ];

  // Fetch chat history
  const { data: chatHistory, isLoading: isLoadingHistory } = useQuery<ChatMessageResponse[]>({
    queryKey: [`/api/resume/${resumeId}/chat`],
    onSuccess: (data) => {
      if (data.length === 0) {
        // If no chat history, add a welcome message
        setMessages([
          {
            role: "ai",
            content: "Hello! I'm your AI career coach. Based on your resume analysis, I can help you develop a career strategy. What would you like to know?",
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        setMessages(data);
      }
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => sendChatMessage(resumeId, content),
    onMutate: async (content) => {
      // Optimistically update messages with user message
      const userMessage: ChatMessageResponse = {
        role: "user",
        content,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
    },
    onSuccess: (data) => {
      // Add AI response
      queryClient.invalidateQueries({ queryKey: [`/api/resume/${resumeId}/chat`] });
      setMessages((prev) => [...prev, data]);
    },
  });

  const handleSendMessage = async (content: string) => {
    await sendMessageMutation.mutateAsync(content);
  };

  const handleDownloadReport = () => {
    // In a real implementation, generate a PDF report
    alert("In a real implementation, this would generate a PDF report");
  };

  const handleGoBack = () => {
    navigate(`/results/${resumeId}`);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <StepIndicator steps={steps} currentStep={currentStep} />

      <Card className="overflow-hidden mb-8">
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-xl font-bold text-gray-800">AI Career Coach</h2>
          <p className="text-gray-600 mt-1">Get personalized career advice and answers to your questions.</p>
        </div>

        <Chat
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={sendMessageMutation.isPending}
          suggestedQuestions={suggestedQuestions}
        />
      </Card>

      <div className="mt-8 flex justify-between">
        <Button
          variant="outline"
          onClick={handleGoBack}
          className="px-4 py-2"
        >
          <i className="fas fa-arrow-left mr-2"></i> Back to Analysis
        </Button>
        <Button
          onClick={handleDownloadReport}
          className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white"
        >
          <i className="fas fa-download mr-2"></i> Download Full Report
        </Button>
      </div>
    </div>
  );
};

export default CoachPage;
