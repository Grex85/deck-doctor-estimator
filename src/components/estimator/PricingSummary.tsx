import { useState } from "react";
import { DollarSign, Calculator, Package, User } from "lucide-react";

interface PricingSummaryProps {
  jobTypes: string[];
  jobSpecificAnswers: Record<string, any>;
  permitRequired: boolean;
  painInTheAssCharge: number;
  assignedCrew: string;
  onPermitRequiredChange: (required: boolean) => void;
  onPainInTheAssChargeChange: (charge: number) => void;
}

export function PricingSummary({
  jobTypes,
  jobSpecificAnswers,
  permitRequired,
  painInTheAssCharge,
  assignedCrew,
  onPermitRequiredChange,
  onPainInTheAssChargeChange
}: PricingSummaryProps) {
  const [showDetailedPricing, setShowDetailedPricing] = useState(false);

  // Get hourly rate based on assigned crew
  const getHourlyRate = (): number => {
    if (assignedCrew === "Alex") return 166;
    if (assignedCrew === "Huber") return 95;
    // Default or "Both" - use average
    return 130.5; // Average of 166 and 95
  };

  const getCrewRateLabel = (): string => {
    if (assignedCrew === "Alex") return "Crew A - Alex ($166/hr)";
    if (assignedCrew === "Huber") return "Crew B - Huber ($95/hr)";
    if (assignedCrew === "Both") return "Both Crews (avg $130.50/hr)";
    return "No crew assigned (avg $130.50/hr)";
  };

  // Calculate total material costs from all questions
  const getTotalMaterialCosts = (): number => {
    let total = 0;
    Object.keys(jobSpecificAnswers).forEach((key) => {
      if (key.endsWith('_material_cost')) {
        const value = parseFloat(jobSpecificAnswers[key] || 0);
        if (!isNaN(value)) {
          total += value;
        }
      }
    });
    return total;
  };

  // Calculate total labor hours from all questions
  const getTotalLaborHours = (): number => {
    let total = 0;
    Object.keys(jobSpecificAnswers).forEach((key) => {
      if (key.endsWith('_labor_hours')) {
        const value = parseFloat(jobSpecificAnswers[key] || 0);
        if (!isNaN(value)) {
          total += value;
        }
      }
    });
    return total;
  };

  // Calculation functions
  const getMaterialsBreakdown = (): Array<{ name: string; quantity: string; unit: string; cost: number }> => {
    const breakdown: Array<{ name: string; quantity: string; unit: string; cost: number }> = [];

    jobTypes.forEach((jobType) => {
      if (jobType.includes("New Build")) {
        const dimensions = jobSpecificAnswers[`${jobType}_main_deck_dimensions`];
        if (dimensions && Array.isArray(dimensions)) {
          const totalSqFt = dimensions.reduce((total: number, dim: any) => {
            return total + (parseFloat(dim.length || 0) * parseFloat(dim.width || 0));
          }, 0);

          if (totalSqFt > 0) {
            breakdown.push({
              name: "Composite Decking",
              quantity: (totalSqFt * 2.2).toFixed(1),
              unit: "linear ft",
              cost: totalSqFt * 2.2 * 4.5 * 1.15
            });

            breakdown.push({
              name: "2x8 Pressure Treated Joists",
              quantity: (totalSqFt / 10).toFixed(1),
              unit: "pieces",
              cost: (totalSqFt / 10) * 12 * 1.75 * 1.15
            });

            breakdown.push({
              name: "2x10 Beams",
              quantity: "100",
              unit: "linear ft",
              cost: 100 * 2.25 * 1.15
            });
          }
        }
      }

      if (jobType.includes("Refinishing")) {
        const sqft = parseFloat(jobSpecificAnswers[`${jobType}_deck_square_footage`] || "0");
        if (sqft > 0) {
          breakdown.push({
            name: "Deck Stain/Sealer",
            quantity: Math.ceil(sqft / 250).toString(),
            unit: "gallons",
            cost: Math.ceil(sqft / 250) * 45 * 1.15
          });
        }
      }
    });

    return breakdown;
  };

  const getLaborBreakdown = (): Array<{ name: string; hours: string; rate: number; cost: number }> => {
    const breakdown: Array<{ name: string; hours: string; rate: number; cost: number }> = [];

    jobTypes.forEach((jobType) => {
      if (jobType.includes("New Build")) {
        const dimensions = jobSpecificAnswers[`${jobType}_main_deck_dimensions`];
        if (dimensions && Array.isArray(dimensions)) {
          const totalSqFt = dimensions.reduce((total: number, dim: any) => {
            return total + (parseFloat(dim.length || 0) * parseFloat(dim.width || 0));
          }, 0);

          if (totalSqFt > 0) {
            breakdown.push({
              name: "Framing Labor",
              hours: (totalSqFt / 50).toFixed(1),
              rate: 75,
              cost: (totalSqFt / 50) * 75
            });

            breakdown.push({
              name: "Decking Installation",
              hours: (totalSqFt / 75).toFixed(1),
              rate: 75,
              cost: (totalSqFt / 75) * 75
            });
          }
        }
      }

      if (jobType.includes("Refinishing")) {
        const sqft = parseFloat(jobSpecificAnswers[`${jobType}_deck_square_footage`] || "0");
        if (sqft > 0) {
          breakdown.push({
            name: "Refinishing Labor",
            hours: (sqft / 100).toFixed(1),
            rate: 65,
            cost: (sqft / 100) * 65
          });
        }
      }

      if (jobType.includes("Repair")) {
        breakdown.push({
          name: "Repair Labor",
          hours: "8",
          rate: 75,
          cost: 600
        });
      }
    });

    return breakdown;
  };

  const calculateMaterialsTotal = () => {
    const breakdownItems = getMaterialsBreakdown();
    const calculatedTotal = breakdownItems.reduce((sum, item) => sum + item.cost, 0);
    const userEnteredTotal = getTotalMaterialCosts();
    return calculatedTotal + userEnteredTotal;
  };

  const calculateLaborTotal = () => {
    const breakdownItems = getLaborBreakdown();
    const calculatedTotal = breakdownItems.reduce((sum, item) => sum + item.cost, 0);
    // Labor hours are at hourly rate based on assigned crew
    const userEnteredHours = getTotalLaborHours();
    const hourlyRate = getHourlyRate();
    const userEnteredLaborCost = userEnteredHours * hourlyRate;
    return calculatedTotal + userEnteredLaborCost;
  };

  const calculateOverheadAndProfit = () => {
    const subtotal = calculateMaterialsTotal() + calculateLaborTotal();
    const overhead = subtotal * 0.10;
    const profit = subtotal * 0.20;
    return overhead + profit;
  };

  const calculateEstimatedTotal = () => {
    const materials = calculateMaterialsTotal();
    const labor = calculateLaborTotal();
    const overheadProfit = calculateOverheadAndProfit();
    const permit = permitRequired ? 250 : 0;
    const painCharge = painInTheAssCharge || 0;
    return materials + labor + overheadProfit + permit + painCharge;
  };

  return (
    <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border-2 border-green-300 shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
        <DollarSign className="w-6 h-6 mr-2 text-green-600" />
        Pricing Summary
      </h2>

      {jobTypes.length > 0 ? (
        <div className="space-y-6">
          {/* Quick Estimate Display */}
          <div className="bg-white p-6 rounded-lg border-2 border-green-400 shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Estimated Total</h3>
              <div className="text-3xl font-bold text-green-600">
                ${calculateEstimatedTotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 pt-4 border-t-2 border-gray-200">
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Materials</div>
                <div className="text-lg font-bold text-blue-600">
                  ${calculateMaterialsTotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Labor</div>
                <div className="text-lg font-bold text-purple-600">
                  ${calculateLaborTotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Overhead & Profit</div>
                <div className="text-lg font-bold text-orange-600">
                  ${calculateOverheadAndProfit().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Breakdown Toggle */}
          <div>
            <button
              onClick={() => setShowDetailedPricing(!showDetailedPricing)}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center transition-colors"
            >
              <Calculator className="w-5 h-5 mr-2" />
              {showDetailedPricing ? "Hide" : "Show"} Detailed Cost Breakdown
            </button>
          </div>

          {/* Detailed Pricing Breakdown */}
          {showDetailedPricing && (
            <div className="bg-white p-6 rounded-lg border-2 border-blue-300 space-y-6">
              {/* Materials Breakdown */}
              <div>
                <h4 className="font-bold text-gray-800 mb-3 text-lg flex items-center">
                  <Package className="w-5 h-5 mr-2 text-blue-600" />
                  Materials Breakdown
                </h4>
                <div className="space-y-2 text-sm">
                  {getMaterialsBreakdown().map((item, idx) => (
                    <div key={idx} className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-700">
                        {item.name} <span className="text-gray-500">({item.quantity} {item.unit})</span>
                      </span>
                      <span className="font-medium text-blue-600">
                        ${item.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-bold text-blue-700">
                    <span>Materials Subtotal (with markup)</span>
                    <span>${calculateMaterialsTotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Labor Breakdown */}
              <div>
                <h4 className="font-bold text-gray-800 mb-3 text-lg flex items-center">
                  <User className="w-5 h-5 mr-2 text-purple-600" />
                  Labor Breakdown
                </h4>
                <div className="space-y-2 text-sm">
                  {getLaborBreakdown().map((item, idx) => (
                    <div key={idx} className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-700">
                        {item.name} <span className="text-gray-500">({item.hours} hours @ ${item.rate}/hr)</span>
                      </span>
                      <span className="font-medium text-purple-600">
                        ${item.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-bold text-purple-700">
                    <span>Labor Subtotal</span>
                    <span>${calculateLaborTotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* User-Entered Costs Summary */}
              <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-300">
                <h4 className="font-bold text-gray-800 mb-3 text-lg">Field Estimator Entry Totals</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2">
                    <span className="text-gray-700 font-medium">Total Material Costs (from questions)</span>
                    <span className="font-bold text-blue-600">
                      ${getTotalMaterialCosts().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-700 font-medium">Total Labor Hours (from questions)</span>
                    <span className="font-bold text-purple-600">
                      {getTotalLaborHours().toFixed(1)} hours
                    </span>
                  </div>
                  <div className="flex justify-between py-2 pt-2 border-t border-yellow-400">
                    <span className="text-gray-700 font-medium">Labor Cost ({getCrewRateLabel()})</span>
                    <span className="font-bold text-purple-600">
                      ${(getTotalLaborHours() * getHourlyRate()).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-3 italic">
                  These totals are from the material cost and labor hours fields entered in each question section.
                </p>
              </div>

              {/* Final Totals */}
              <div className="pt-4 border-t-2 border-gray-300">
                <div className="space-y-2 text-base">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Subtotal</span>
                    <span className="font-medium">${(calculateMaterialsTotal() + calculateLaborTotal()).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Overhead (10%)</span>
                    <span className="font-medium">${(calculateOverheadAndProfit() * 0.33).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Profit (20%)</span>
                    <span className="font-medium">${(calculateOverheadAndProfit() * 0.67).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {permitRequired && (
                    <div className="flex justify-between">
                      <span className="text-gray-700">Permit Fee</span>
                      <span className="font-medium">$250.00</span>
                    </div>
                  )}
                  {painInTheAssCharge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-700">Additional Complexity Charge</span>
                      <span className="font-medium">${painInTheAssCharge.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold text-green-600 pt-2 border-t-2 border-green-300">
                    <span>Total Estimate</span>
                    <span>${calculateEstimatedTotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Pricing Notes */}
              <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                <p className="text-yellow-800 text-sm">
                  <strong>Note:</strong> This is an automated estimate based on the information provided. Final pricing may vary based on site conditions, material availability, and additional requirements discovered during the project.
                </p>
              </div>
            </div>
          )}

          {/* Pricing Controls */}
          <div className="bg-white p-4 rounded-lg border border-gray-300">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Additional Complexity Charge ("Pain in the Ass" Factor)
                </label>
                <input
                  type="number"
                  value={painInTheAssCharge || 0}
                  onChange={(e) => onPainInTheAssChargeChange(parseFloat(e.target.value) || 0)}
                  className="w-full p-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium bg-white"
                  placeholder="0.00"
                  step="50"
                  min="0"
                />
                <p className="text-xs text-gray-600 mt-1">Add extra charge for difficult site conditions, tight access, or complex requirements</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Permit Required?
                </label>
                <select
                  value={permitRequired ? "yes" : "no"}
                  onChange={(e) => onPermitRequiredChange(e.target.value === "yes")}
                  className="w-full p-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium bg-white"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes (+$250)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Calculator className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Select job types above to see pricing estimates</p>
        </div>
      )}
    </div>
  );
}
