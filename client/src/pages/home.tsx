import React from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const HomePage: React.FC = () => {
  const [, navigate] = useLocation();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI-Powered Resume Analysis & Career Coach
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Upload your resume and get instant insights, skill comparisons, and personalized career recommendations.
          </p>
          <button
            onClick={() => navigate("/upload")}
            className="px-8 py-6 bg-primary-600 hover:bg-primary-700 text-white text-lg rounded-lg shadow-md transition-all font-semibold"
          >
            Analyze My Resume Now
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-primary-600">
                  <i className="fas fa-file-alt text-2xl"></i>
                </span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Resume Analysis</h3>
              <p className="text-gray-600 mt-2">
                Extract skills, experience, and education from your resume using advanced AI.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-secondary-600">
                  <i className="fas fa-chart-pie text-2xl"></i>
                </span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Market Comparison</h3>
              <p className="text-gray-600 mt-2">
                Compare your resume against current job market trends and requirements.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600">
                  <i className="fas fa-robot text-2xl"></i>
                </span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">AI Career Coach</h3>
              <p className="text-gray-600 mt-2">
                Chat with an AI coach for personalized career advice and guidance.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-primary-600">1</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Upload Resume</h3>
            <p className="text-gray-600 text-sm">
              Upload your resume in PDF or DOCX format.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-primary-600">2</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">AI Analysis</h3>
            <p className="text-gray-600 text-sm">
              Our AI extracts and analyzes your skills and experience.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-primary-600">3</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Get Insights</h3>
            <p className="text-gray-600 text-sm">
              Review detailed analysis and job market comparison.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-primary-600">4</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Career Coaching</h3>
            <p className="text-gray-600 text-sm">
              Chat with AI for personalized career guidance.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Link href="/upload">
          <button className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-md transition-all font-semibold text-base">
            Get Started Now
          </button>
        </Link>
      </div>
    </div>
  );
};

export default HomePage;
