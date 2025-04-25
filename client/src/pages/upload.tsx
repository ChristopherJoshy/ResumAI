import React, { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StepIndicator from "@/components/ui/step-indicator";
import FileUpload from "@/components/ui/file-upload";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UploadPageProps {
  onUploadComplete: (resumeId: number) => void;
}

const UploadPage: React.FC<UploadPageProps> = ({ onUploadComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const steps = [
    { number: 1, label: "Upload" },
    { number: 2, label: "Analysis" },
    { number: 3, label: "Results" },
    { number: 4, label: "AI Coach" },
  ];

  const handleFileSelected = (selectedFile: File | null) => {
    setFile(selectedFile);
  };

  const handleContinue = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please upload your resume to continue",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const response = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Call the callback first to update the resumeId in parent component
      onUploadComplete(data.resumeId);
      
      // Then navigate to analyzing page
      navigate(`/analyzing/${data.resumeId}`);
      
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload resume",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <StepIndicator steps={steps} currentStep={1} />

      <Card className="mb-8">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Upload Your Resume</h2>
          <p className="text-gray-600 mb-6">
            Upload your resume in PDF or DOCX format. Our AI will analyze it and provide personalized recommendations.
          </p>

          <FileUpload onFileSelected={handleFileSelected} />

          <div className="mt-8">
            {/* Display file information after selection */}
            {file && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center mb-2">
                  <i className="fas fa-check-circle text-green-500 mr-2"></i>
                  <span className="font-semibold text-green-700">Resume Uploaded</span>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  Filename: <span className="font-medium">{file.name}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Size: <span className="font-medium">{(file.size / 1024).toFixed(1)} KB</span>
                </p>
              </div>
            )}
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-gray-500 mb-4 md:mb-0">
                <span className="text-primary-500 inline-flex items-center">
                  <i className="fas fa-shield-alt mr-2"></i>
                  Your resume data is protected and never shared without your permission.
                </span>
              </p>
              <button
                onClick={handleContinue}
                disabled={!file || isUploading}
                className="px-5 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition font-semibold"
              >
                {isUploading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </>
                ) : (
                  "Continue to Analysis"
                )}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadPage;
