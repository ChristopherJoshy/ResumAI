import React, { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StepIndicator from "@/components/ui/step-indicator";
import { useQuery } from "@tanstack/react-query";
import {
  getSkillIcon,
  getSkillColorClass,
  getLevelClass,
  getImprovementClass,
  getMatchScoreColor,
  getGapIndicator
} from "@/lib/utils";
import { AnalysisResponse } from "@shared/schema";

interface ResultsPageProps {
  resumeId: number;
  currentStep: number;
  onNextStep: () => void;
}

const ResultsPage: React.FC<ResultsPageProps> = ({
  resumeId,
  currentStep,
  onNextStep
}) => {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("skills");
  const [selectedJob, setSelectedJob] = useState<any>(null);

  const steps = [
    { number: 1, label: "Upload" },
    { number: 2, label: "Analysis" },
    { number: 3, label: "Results" },
    { number: 4, label: "AI Coach" },
  ];

  // Fetch analysis data
  const { data: analysis, isLoading } = useQuery<AnalysisResponse>({
    queryKey: [`/api/resume/${resumeId}/analysis`],
  });

  const handleDownloadReport = () => {
    // In a real implementation, generate a PDF report
    alert("In a real implementation, this would generate a PDF report");
  };

  const handleGoToChat = () => {
    onNextStep();
    navigate(`/coach/${resumeId}`);
  };

  const handleGoBack = () => {
    navigate(`/upload`);
  };

  const handleViewJobDescription = (job: any) => {
    setSelectedJob(job);
  };

  const handleApplyNow = (url: string) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      alert('No application link available for this job.');
    }
  };

  const handleCloseJobDescription = () => {
    setSelectedJob(null);
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <StepIndicator steps={steps} currentStep={currentStep} />
        <Card className="p-8 flex justify-center items-center min-h-[400px]">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading analysis results...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="max-w-6xl mx-auto">
        <StepIndicator steps={steps} currentStep={currentStep} />
        <Card className="p-8">
          <CardContent className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Analysis Not Found</h2>
            <p className="text-gray-600 mb-6">
              We couldn't find the analysis results for your resume. Please try uploading your resume again.
            </p>
            <Button onClick={handleGoBack}>
              Go Back to Upload
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <StepIndicator steps={steps} currentStep={currentStep} />

      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Resume Analysis Results</h2>
              <p className="text-gray-600">Here's what we found in your resume and how it compares to the job market.</p>
            </div>
            <div className="mt-4 md:mt-0">
              <Button
                variant="outline"
                onClick={handleDownloadReport}
                className="flex items-center"
              >
                <i className="fas fa-download mr-2"></i> Download Report
              </Button>
            </div>
          </div>

          {/* Resume Overview Summary */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Resume Overview</h3>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-sm font-medium text-gray-500">Extracted Skills</div>
                <div className="text-2xl font-bold text-gray-800 mt-1">
                  {analysis.skills.length}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-sm font-medium text-gray-500">Experience Level</div>
                <div className="text-2xl font-bold text-gray-800 mt-1">
                  {analysis.experienceLevel}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-sm font-medium text-gray-500">Market Match</div>
                <div className="text-2xl font-bold text-gray-800 mt-1">
                  {analysis.marketMatchScore}%
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Tabs */}
      <Card className="overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b border-gray-200">
            <TabsList className="border-b-0 rounded-none h-auto bg-transparent">
              <TabsTrigger
                value="skills"
                className="py-4 px-6 text-center data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=active]:text-primary-600 data-[state=active]:shadow-none data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent rounded-none font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap"
              >
                Skills Analysis
              </TabsTrigger>
              <TabsTrigger
                value="jobs"
                className="py-4 px-6 text-center data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=active]:text-primary-600 data-[state=active]:shadow-none data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent rounded-none font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap"
              >
                Job Recommendations
              </TabsTrigger>
              <TabsTrigger
                value="improvements"
                className="py-4 px-6 text-center data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=active]:text-primary-600 data-[state=active]:shadow-none data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent rounded-none font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap"
              >
                Improvements
              </TabsTrigger>
              <TabsTrigger
                value="career"
                className="py-4 px-6 text-center data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=active]:text-primary-600 data-[state=active]:shadow-none data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent rounded-none font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap"
              >
                Career Paths
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content: Skills Analysis */}
          <TabsContent value="skills" className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Top Skills</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.skills.slice(0, 4).map((skill, index) => {
                  const colorClass = getSkillColorClass(skill.category);
                  return (
                    <div key={index} className="flex items-center bg-gray-50 p-3 rounded-lg">
                      <div className="mr-4">
                        <div className={`w-12 h-12 rounded-full ${colorClass.bg} flex items-center justify-center`}>
                          <i className={`fas fa-${getSkillIcon(skill.category)} ${colorClass.icon}`}></i>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-800">{skill.name}</span>
                          <span className={`text-xs font-medium ${getLevelClass(skill.level).bg} ${getLevelClass(skill.level).text} px-2 py-0.5 rounded-full`}>
                            {skill.level}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full"
                            style={{ width: `${skill.proficiency}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Market Demand Comparison</h3>
              <div className="relative overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3">Skill</th>
                      <th scope="col" className="px-6 py-3">Your Level</th>
                      <th scope="col" className="px-6 py-3">Market Demand</th>
                      <th scope="col" className="px-6 py-3">Gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.skills.map((skill, index) => {
                      // Mock market demand (this would come from real data in a production app)
                      const marketDemand = Math.min(100, skill.proficiency + Math.floor(Math.random() * 30) - 10);
                      const gap = marketDemand - skill.proficiency;
                      const gapIndicator = getGapIndicator(gap);

                      return (
                        <tr key={index} className="bg-white border-b">
                          <td className="px-6 py-4 font-medium text-gray-900">{skill.name}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className="bg-primary-600 h-2 rounded-full"
                                  style={{ width: `${skill.proficiency}%` }}
                                ></div>
                              </div>
                              <span>{skill.proficiency}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className="bg-secondary-600 h-2 rounded-full"
                                  style={{ width: `${marketDemand}%` }}
                                ></div>
                              </div>
                              <span>{marketDemand}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {gap > 0 ? (
                              <span className="text-xs font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                <i className={`fas fa-${gapIndicator.icon} mr-1 ${gapIndicator.color}`}></i> {gap}%
                              </span>
                            ) : (
                              <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                <i className="fas fa-check mr-1"></i> Match
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Tab Content: Job Recommendations */}
          <TabsContent value="jobs" className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recommended Jobs Based on Your Profile</h3>
            <p className="text-gray-600 mb-6">These positions match your skill set and experience level.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {analysis.jobRecommendations.map((job, index) => (
                <div key={index} className="border border-gray-200 rounded-lg hover:shadow-md transition">
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800">{job.title}</h4>
                        <p className="text-gray-600 mt-1">{job.company}</p>
                      </div>
                      <span className={`${getMatchScoreColor(job.match)} text-xs font-medium px-2.5 py-0.5 rounded-full`}>
                        {job.match}% Match
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {job.skills.map((skill, skillIndex) => (
                        <span key={skillIndex} className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 text-sm text-gray-600">
                      <div className="flex items-center mb-2">
                        <i className="fas fa-map-marker-alt w-5 text-gray-400"></i>
                        <span>{job.location}</span>
                      </div>
                      <div className="flex items-center mb-2">
                        <i className="fas fa-dollar-sign w-5 text-gray-400"></i>
                        <span>{job.salary}</span>
                      </div>
                      <div className="flex items-center">
                        <i className="fas fa-briefcase w-5 text-gray-400"></i>
                        <span>{job.type}</span>
                      </div>
                    </div>

                    <div className="mt-5 flex justify-between">
                      <button
                        className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                        onClick={() => handleViewJobDescription(job)}
                      >
                        View Full Description
                      </button>
                      <button
                        className="bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md px-3 py-1.5 text-sm"
                        onClick={() => handleApplyNow(job.url)}
                      >
                        Apply Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <button className="px-4 py-2 text-primary-600 font-medium hover:text-primary-700 transition">
                View More Job Recommendations <i className="fas fa-chevron-right ml-1"></i>
              </button>
            </div>
          </TabsContent>

          {/* Tab Content: Improvements */}
          <TabsContent value="improvements" className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Suggested Improvements</h3>
            <p className="text-gray-600 mb-6">Based on our analysis, here are some ways to strengthen your resume.</p>

            <div className="space-y-6">
              {analysis.improvements.map((improvement, index) => {
                const classes = getImprovementClass(improvement.type);
                return (
                  <div
                    key={index}
                    className={`${classes.bg} border-l-4 ${classes.border} p-4 rounded-r-lg`}
                  >
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <i className={`fas fa-${classes.icon} ${classes.iconClass}`}></i>
                      </div>
                      <div className="ml-3">
                        <h4 className={`text-sm font-medium ${classes.text.replace('text-', 'text-').replace('700', '800')}`}>
                          {improvement.message}
                        </h4>
                        <div className={`mt-2 text-sm ${classes.text}`}>
                          <p>{improvement.details}</p>
                          {improvement.tags && improvement.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {improvement.tags.map((tag, tagIndex) => (
                                <span
                                  key={tagIndex}
                                  className={`${classes.bg.replace('50', '100')} ${classes.text.replace('700', '800')} text-xs font-medium px-2.5 py-0.5 rounded`}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 bg-white border border-gray-200 rounded-lg p-5">
              <h4 className="font-medium text-gray-800 mb-3">Recommended Certifications</h4>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 text-primary-500 mt-0.5">
                    <i className="fas fa-certificate"></i>
                  </div>
                  <div className="ml-3">
                    <p className="text-gray-800 font-medium">AWS Certified Machine Learning - Specialty</p>
                    <p className="text-sm text-gray-600 mt-0.5">Validates expertise in using ML on the AWS platform.</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 text-primary-500 mt-0.5">
                    <i className="fas fa-certificate"></i>
                  </div>
                  <div className="ml-3">
                    <p className="text-gray-800 font-medium">Docker Certified Associate</p>
                    <p className="text-sm text-gray-600 mt-0.5">Demonstrates containerization skills highly valued in today's market.</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 text-primary-500 mt-0.5">
                    <i className="fas fa-certificate"></i>
                  </div>
                  <div className="ml-3">
                    <p className="text-gray-800 font-medium">TensorFlow Developer Certificate</p>
                    <p className="text-sm text-gray-600 mt-0.5">Shows proficiency in building ML models using TensorFlow.</p>
                  </div>
                </li>
              </ul>
            </div>
          </TabsContent>

          {/* Tab Content: Career Paths */}
          <TabsContent value="career" className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Potential Career Paths</h3>
            <p className="text-gray-600 mb-6">Based on your skills and experience, here are potential career trajectories.</p>

            <div className="relative">
              {/* Career path diagram */}
              <div className="flex flex-col md:flex-row items-start justify-between">
                <div className="flex-1 md:mr-8 mb-8 md:mb-0">
                  <div className="bg-primary-50 border border-primary-200 rounded-lg p-5 relative">
                    <h4 className="font-semibold text-primary-900">Current Position</h4>
                    <p className="text-primary-800 mt-1">Data Analyst</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {analysis.skills.slice(0, 3).map((skill, index) => (
                        <span
                          key={index}
                          className="bg-primary-100 text-primary-800 text-xs font-medium px-2.5 py-0.5 rounded"
                        >
                          {skill.name}
                        </span>
                      ))}
                    </div>
                    <div className="hidden md:block absolute -right-5 top-1/2 transform -translate-y-1/2 text-gray-400">
                      <i className="fas fa-chevron-right text-xl"></i>
                    </div>
                    <div className="block md:hidden absolute left-1/2 -bottom-5 transform -translate-x-1/2 text-gray-400">
                      <i className="fas fa-chevron-down text-xl"></i>
                    </div>
                  </div>
                </div>

                <div className="flex-1 md:ml-8">
                  {analysis.careerPaths.map((path, index) => (
                    <div
                      key={index}
                      className={`${
                        path.recommended
                          ? "bg-secondary-50 border-secondary-200"
                          : "bg-gray-50 border-gray-200"
                      } border rounded-lg p-5 ${index < analysis.careerPaths.length - 1 ? "mb-6" : ""}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className={`font-semibold ${
                            path.recommended ? "text-secondary-900" : "text-gray-900"
                          }`}>
                            Path {index + 1}: {path.name}
                          </h4>
                          <p className={path.recommended ? "text-secondary-800 mt-1" : "text-gray-800 mt-1"}>
                            {path.roles.join(" → ")}
                          </p>
                        </div>
                        {path.recommended && (
                          <span className="bg-secondary-100 text-secondary-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {path.requiredSkills.map((skill, skillIndex) => (
                          <span
                            key={skillIndex}
                            className={`${
                              path.recommended
                                ? "bg-secondary-100 text-secondary-800"
                                : "bg-gray-200 text-gray-800"
                            } text-xs font-medium px-2.5 py-0.5 rounded`}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <h4 className="font-medium text-gray-800 mb-4">Skills to Develop for Career Growth</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.careerPaths.slice(0, 2).map((path, pathIndex) => (
                    <div key={pathIndex} className="bg-white border border-gray-200 rounded-lg p-4">
                      <h5 className={`text-sm font-medium ${
                        path.recommended ? "text-secondary-800" : "text-gray-800"
                      } mb-2`}>
                        For {path.name} Path
                      </h5>
                      <ul className="space-y-2 text-sm text-gray-600">
                        {path.requiredSkills.map((skill, skillIndex) => (
                          <li key={skillIndex} className="flex items-center">
                            <i className={`fas fa-arrow-right ${
                              path.recommended ? "text-secondary-500" : "text-gray-500"
                            } mr-2`}></i>
                            <span>{skill}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <div className="mt-8 flex justify-between">
        <Button
          variant="outline"
          onClick={handleGoBack}
          className="px-4 py-2"
        >
          <i className="fas fa-arrow-left mr-2"></i> Back
        </Button>
        <Button
          onClick={handleGoToChat}
          className="px-5 py-2 bg-primary-600 text-white"
        >
          Talk to AI Career Coach <i className="fas fa-arrow-right ml-2"></i>
        </Button>
      </div>

      {/* Job Description Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{selectedJob.title}</h3>
                  <p className="text-gray-600 mt-1">{selectedJob.company}</p>
                </div>
                <button
                  onClick={handleCloseJobDescription}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <div className="mb-4">
                <span className={`${getMatchScoreColor(selectedJob.match)} text-xs font-medium px-2.5 py-0.5 rounded-full`}>
                  {selectedJob.match}% Match
                </span>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Job Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center">
                    <i className="fas fa-map-marker-alt w-5 text-gray-400"></i>
                    <span className="text-gray-600">{selectedJob.location}</span>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-dollar-sign w-5 text-gray-400"></i>
                    <span className="text-gray-600">{selectedJob.salary}</span>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-briefcase w-5 text-gray-400"></i>
                    <span className="text-gray-600">{selectedJob.type}</span>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-building w-5 text-gray-400"></i>
                    <span className="text-gray-600">{selectedJob.company}</span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Required Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedJob.skills.map((skill: string, index: number) => (
                    <span key={index} className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Job Description</h4>
                <p className="text-gray-600 text-sm">
                  {selectedJob.summary || "No detailed description available for this position. Please click 'Apply Now' to view the full job posting on the company's website."}
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => handleApplyNow(selectedJob.url)}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md px-4 py-2 text-sm"
                >
                  Apply Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsPage;
