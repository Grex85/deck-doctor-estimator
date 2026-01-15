import { BarChart, ClipboardList, CheckCircle } from "lucide-react";

interface AssessmentSummaryProps {
  jobTypes: string[];
  jobSpecificAnswers: Record<string, any>;
}

export function AssessmentSummary({ jobTypes, jobSpecificAnswers }: AssessmentSummaryProps) {
  // Only show for non-new builds
  if (!jobTypes.some(jt => !jt.includes("New Build")) || jobTypes.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border-2 border-blue-200">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
        <BarChart className="w-5 h-5 mr-2" />
        Current Conditions & Recommendations Summary
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Current Conditions Summary */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-bold text-blue-800 mb-3 flex items-center">
            <ClipboardList className="w-4 h-4 mr-2" />
            Current Conditions
          </h3>
          <div className="space-y-2 text-sm">
            {Object.entries(jobSpecificAnswers)
              .filter(([key]) => key.includes('current_') && key.includes('_condition'))
              .map(([key, value]) => {
                const jobType = key.split('_current_')[0];
                const component = key.split('_current_')[1].replace('_condition', '');
                const condition = (value as any)?.condition || 'Not assessed';
                const colorClass = condition === 'Excellent' ? 'text-green-700' :
                  condition === 'Good' ? 'text-blue-700' :
                  condition === 'Fair' ? 'text-yellow-700' :
                  condition === 'Poor' ? 'text-orange-700' :
                  condition === 'Failed' ? 'text-red-700' : 'text-gray-600';

                return (
                  <div key={key} className="flex justify-between">
                    <span className="text-blue-800 capitalize">{jobType} {component}:</span>
                    <span className={`font-medium ${colorClass}`}>{condition}</span>
                  </div>
                );
              })}
            {Object.entries(jobSpecificAnswers)
              .filter(([key]) => key.includes('current_') && key.includes('_condition')).length === 0 && (
              <p className="text-blue-600 italic">Complete current condition assessments to see summary</p>
            )}
          </div>
        </div>

        {/* Recommendations Summary */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="font-bold text-green-800 mb-3 flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            Key Recommendations
          </h3>
          <div className="space-y-2 text-sm">
            {Object.entries(jobSpecificAnswers)
              .filter(([key, value]) => key.includes('recommended_') && value && (
                (typeof value === 'object' && (value as any).description) ||
                (typeof value === 'string' && value !== '' && value !== 'Keep existing' && value !== 'No change needed')
              ))
              .slice(0, 6) // Show first 6 recommendations
              .map(([key, value]) => {
                const jobType = key.split('_recommended_')[0];
                const component = key.split('_recommended_')[1];
                const recommendation = typeof value === 'object' ?
                  (value as any).description || JSON.stringify(value) :
                  String(value);

                return (
                  <div key={key} className="border-l-2 border-green-400 pl-2">
                    <span className="text-green-800 font-medium capitalize">{jobType} {component}:</span>
                    <p className="text-green-700 text-xs">{recommendation}</p>
                  </div>
                );
              })}
            {Object.entries(jobSpecificAnswers)
              .filter(([key, value]) => key.includes('recommended_') && value).length === 0 && (
              <p className="text-green-600 italic">Complete recommendations to see summary</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
