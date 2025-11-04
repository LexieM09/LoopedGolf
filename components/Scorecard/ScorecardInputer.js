import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ScorecardInput({ scores, onChange }) {
  const handleScoreChange = (holeIndex, value) => {
    const newScores = [...scores];
    // Only accept numeric input
    if (value === "" || /^\d+$/.test(value)) {
      newScores[holeIndex] = value ? parseInt(value) : 0;
      onChange(newScores);
    }
  };

  const totalScore = scores.reduce((sum, score) => sum + (score || 0), 0);
  const frontNine = scores.slice(0, 9).reduce((sum, score) => sum + (score || 0), 0);
  const backNine = scores.slice(9, 18).reduce((sum, score) => sum + (score || 0), 0);

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
      <Label className="text-lg font-semibold mb-4 block">Scorecard</Label>
      
      {/* Front 9 */}
      <div className="mb-6">
        <div className="text-sm font-semibold mb-2 text-gray-700">Front 9</div>
        <div className="grid grid-cols-10 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((hole) => (
            <div key={hole} className="text-center">
              <div className="text-xs font-medium text-gray-600 mb-1">{hole}</div>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={scores[hole - 1] || ""}
                onChange={(e) => handleScoreChange(hole - 1, e.target.value)}
                className="h-10 text-center p-0"
                placeholder="-"
              />
            </div>
          ))}
          <div className="text-center">
            <div className="text-xs font-medium text-gray-600 mb-1">Out</div>
            <div className="h-10 bg-green-50 border border-green-200 rounded-md flex items-center justify-center font-bold text-green-700">
              {frontNine || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Back 9 */}
      <div className="mb-4">
        <div className="text-sm font-semibold mb-2 text-gray-700">Back 9</div>
        <div className="grid grid-cols-10 gap-2">
          {[10, 11, 12, 13, 14, 15, 16, 17, 18].map((hole) => (
            <div key={hole} className="text-center">
              <div className="text-xs font-medium text-gray-600 mb-1">{hole}</div>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={scores[hole - 1] || ""}
                onChange={(e) => handleScoreChange(hole - 1, e.target.value)}
                className="h-10 text-center p-0"
                placeholder="-"
              />
            </div>
          ))}
          <div className="text-center">
            <div className="text-xs font-medium text-gray-600 mb-1">In</div>
            <div className="h-10 bg-green-50 border border-green-200 rounded-md flex items-center justify-center font-bold text-green-700">
              {backNine || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Total Score */}
      <div className="flex justify-end items-center gap-4 pt-4 border-t border-gray-200">
        <span className="text-sm font-semibold text-gray-700">Total Score:</span>
        <div className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold text-2xl">
          {totalScore || 0}
        </div>
      </div>
    </div>
  );
}