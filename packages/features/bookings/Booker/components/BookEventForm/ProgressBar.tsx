import React from "react";

import { classNames } from "@calcom/lib";

interface ProgressBarProps {
  progress: number;
  className?: string;
  currentStep: number;
  totalSteps: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, className, currentStep, totalSteps }) => {
  return (
    <div className={classNames("w-full", className)}>
      <div className="mb-1 flex items-center justify-between">
        <div className="mr-2 h-2.5 w-full rounded-full bg-gray-200">
          <div
            className="h-2.5 rounded-full bg-[#111827] transition-all duration-300 ease-in-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="whitespace-nowrap text-sm font-medium text-gray-700">
          {currentStep + 1}/{totalSteps}
        </span>
      </div>
    </div>
  );
};

export default ProgressBar;
