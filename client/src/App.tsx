import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import HomePage from "@/pages/home";
import UploadPage from "@/pages/upload";
import AnalyzingPage from "@/pages/analyzing";
import ResultsPage from "@/pages/results";
import CoachPage from "@/pages/coach";
import { useState } from "react";

function Router() {
  const [currentStep, setCurrentStep] = useState(1);
  const [resumeId, setResumeId] = useState<number | null>(null);

  return (
    <Switch>
      <Route path="/">
        <HomePage />
      </Route>
      <Route path="/upload">
        <UploadPage 
          onUploadComplete={(id) => {
            setResumeId(id);
            setCurrentStep(2);
          }} 
        />
      </Route>
      <Route path="/analyzing/:id">
        {(params) => (
          <AnalyzingPage 
            resumeId={parseInt(params.id)}
            onAnalysisComplete={() => setCurrentStep(3)}
          />
        )}
      </Route>
      <Route path="/results/:id">
        {(params) => (
          <ResultsPage 
            resumeId={parseInt(params.id)}
            currentStep={3}
            onNextStep={() => setCurrentStep(4)}
          />
        )}
      </Route>
      <Route path="/coach/:id">
        {(params) => (
          <CoachPage 
            resumeId={parseInt(params.id)}
            currentStep={4}
          />
        )}
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Layout>
          <Router />
          <Toaster />
        </Layout>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
