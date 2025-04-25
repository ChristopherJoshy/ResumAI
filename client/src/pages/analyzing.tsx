import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import StepIndicator from "@/components/ui/step-indicator";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";

interface AnalyzingPageProps {
  resumeId: number;
  onAnalysisComplete: () => void;
}

const AnalyzingPage: React.FC<AnalyzingPageProps> = ({ 
  resumeId,
  onAnalysisComplete 
}) => {
  const [, navigate] = useLocation();
  const [progressValue, setProgressValue] = useState(0);
  const [status, setStatus] = useState("Extracting skills and experience");

  const steps = [
    { number: 1, label: "Upload" },
    { number: 2, label: "Analysis" },
    { number: 3, label: "Results" },
    { number: 4, label: "AI Coach" },
  ];

  // Polling for status updates
  const { data } = useQuery({
    queryKey: [`/api/resume/${resumeId}/status`],
    refetchInterval: 1000, // Poll every second
  });

  useEffect(() => {
    // Animate progress
    const progressInterval = setInterval(() => {
      setProgressValue(prev => {
        const nextValue = prev + 1;
        if (nextValue >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return nextValue;
      });
    }, 50);

    // Change status messages
    const messages = [
      "Extracting skills and experience",
      "Identifying education and qualifications",
      "Analyzing career trajectory",
      "Comparing with job market trends",
      "Generating recommendations",
      "Finalizing analysis"
    ];

    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setStatus(messages[messageIndex]);
    }, 3000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, []);

  // Check if analysis is complete
  useEffect(() => {
    if (data?.status === "completed") {
      onAnalysisComplete();
      navigate(`/results/${resumeId}`);
    }
  }, [data, resumeId, navigate, onAnalysisComplete]);

  return (
    <div className="max-w-6xl mx-auto">
      <StepIndicator steps={steps} currentStep={2} />

      <Card className="mb-8">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Analyzing Your Resume</h2>
          <p className="text-gray-600 mb-6">
            Our AI is extracting information from your resume and comparing it with current job market trends.
          </p>

          <div className="flex flex-col items-center py-8">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <i className="fas fa-file-alt text-primary-600 text-xl"></i>
              </div>
            </div>
            <div className="mt-6 text-gray-700 font-medium">Processing your resume...</div>
            <div className="mt-2 text-gray-500 text-sm">{status}</div>

            <div className="w-full max-w-md mt-8">
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-primary-600 bg-primary-100">
                      Progress
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-primary-600">
                      {progressValue}%
                    </span>
                  </div>
                </div>
                <Progress value={progressValue} className="h-2 bg-primary-100" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyzingPage;
