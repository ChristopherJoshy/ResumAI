import React from "react";

interface Step {
  number: number;
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStep }) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {steps.map((step, index) => {
          // Create elements array instead of using React.Fragment
          const elements = [];
          
          // Add the step indicator circle with number
          elements.push(
            <div className="flex flex-col items-center" key={`step-${step.number}`}>
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-full font-medium ${
                  step.number <= currentStep
                    ? "bg-primary-500 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {step.number}
              </div>
              <span
                className={`text-sm mt-2 font-medium ${
                  step.number <= currentStep ? "text-gray-900" : "text-gray-500"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
          
          // Add connector line if not the last item
          if (index < steps.length - 1) {
            elements.push(
              <div className="flex-1 h-1 bg-gray-200 mx-2" key={`connector-${step.number}`} />
            );
          }
          
          return elements;
        }).flat()}
      </div>
    </div>
  );
};

export default StepIndicator;
