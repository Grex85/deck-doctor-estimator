import { useState } from "react";
import {
  DollarSign,
  Calculator,
  Package,
  Users,
  ChevronDown,
  ChevronUp,
  Percent,
  FileText,
  Wrench,
  TrendingUp,
  Sparkles,
  Clock,
  AlertCircle
} from "lucide-react";

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
    return 130.5;
  };

  const getCrewInfo = () => {
    if (assignedCrew === "Alex") return { name: "Crew A - Alex", rate: 166, color: "emerald" };
    if (assignedCrew === "Huber") return { name: "Crew B - Huber", rate: 95, color: "blue" };
    if (assignedCrew === "Both") return { name: "Both Crews", rate: 130.5, color: "purple" };
    return { name: "No Crew Assigned", rate: 130.5, color: "gray" };
  };

  // Calculate total material costs from all questions
  const getTotalMaterialCosts = (): number => {
    let total = 0;
    Object.keys(jobSpecificAnswers).forEach((key) => {
      if (key.endsWith('_material_cost')) {
        const value = parseFloat(jobSpecificAnswers[key] || 0);
        if (!isNaN(value)) total += value;
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
        if (!isNaN(value)) total += value;
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
              name: "2x8 PT Joists",
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
    const userEnteredHours = getTotalLaborHours();
    const hourlyRate = getHourlyRate();
    const userEnteredLaborCost = userEnteredHours * hourlyRate;
    return calculatedTotal + userEnteredLaborCost;
  };

  const calculateOverhead = () => {
    const subtotal = calculateMaterialsTotal() + calculateLaborTotal();
    return subtotal * 0.10;
  };

  const calculateProfit = () => {
    const subtotal = calculateMaterialsTotal() + calculateLaborTotal();
    return subtotal * 0.20;
  };

  const calculateEstimatedTotal = () => {
    const materials = calculateMaterialsTotal();
    const labor = calculateLaborTotal();
    const overhead = calculateOverhead();
    const profit = calculateProfit();
    const permit = permitRequired ? 250 : 0;
    const painCharge = painInTheAssCharge || 0;
    return materials + labor + overhead + profit + permit + painCharge;
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Calculate percentage for visual breakdown
  const total = calculateEstimatedTotal();
  const materialsPercent = total > 0 ? (calculateMaterialsTotal() / total) * 100 : 0;
  const laborPercent = total > 0 ? (calculateLaborTotal() / total) * 100 : 0;
  const overheadPercent = total > 0 ? (calculateOverhead() / total) * 100 : 0;
  const profitPercent = total > 0 ? (calculateProfit() / total) * 100 : 0;

  const crewInfo = getCrewInfo();

  // Empty state
  if (jobTypes.length === 0) {
    return (
      <div className="mb-8">
        <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Pricing Estimate</h2>
            </div>
          </div>
          <div className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
              <Calculator className="w-10 h-10 text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-700 mb-2">No Job Types Selected</h3>
            <p className="text-neutral-500">Select job types above to generate a pricing estimate</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 space-y-6">
      {/* Main Total Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Project Estimate</h2>
                <p className="text-emerald-100 text-sm">{jobTypes.join(" + ")}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-emerald-100 text-sm font-medium">Total Estimate</p>
              <p className="text-4xl font-black text-white tracking-tight">
                ${formatCurrency(calculateEstimatedTotal())}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-neutral-100">
          {/* Materials */}
          <div className="p-5 bg-gradient-to-b from-blue-50 to-white">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Materials</span>
            </div>
            <p className="text-2xl font-bold text-neutral-800">${formatCurrency(calculateMaterialsTotal())}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <div className="flex-1 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${materialsPercent}%` }} />
              </div>
              <span className="text-xs font-medium text-blue-600">{materialsPercent.toFixed(0)}%</span>
            </div>
          </div>

          {/* Labor */}
          <div className="p-5 bg-gradient-to-b from-purple-50 to-white">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Labor</span>
            </div>
            <p className="text-2xl font-bold text-neutral-800">${formatCurrency(calculateLaborTotal())}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <div className="flex-1 h-1.5 bg-purple-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${laborPercent}%` }} />
              </div>
              <span className="text-xs font-medium text-purple-600">{laborPercent.toFixed(0)}%</span>
            </div>
          </div>

          {/* Overhead */}
          <div className="p-5 bg-gradient-to-b from-amber-50 to-white">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Overhead</span>
            </div>
            <p className="text-2xl font-bold text-neutral-800">${formatCurrency(calculateOverhead())}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <div className="flex-1 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${overheadPercent}%` }} />
              </div>
              <span className="text-xs font-medium text-amber-600">{overheadPercent.toFixed(0)}%</span>
            </div>
          </div>

          {/* Profit */}
          <div className="p-5 bg-gradient-to-b from-emerald-50 to-white">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Profit</span>
            </div>
            <p className="text-2xl font-bold text-neutral-800">${formatCurrency(calculateProfit())}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <div className="flex-1 h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${profitPercent}%` }} />
              </div>
              <span className="text-xs font-medium text-emerald-600">{profitPercent.toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Visual Cost Bar */}
        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Cost Distribution</span>
          </div>
          <div className="h-4 bg-neutral-200 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
              style={{ width: `${materialsPercent}%` }}
              title="Materials"
            />
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-500"
              style={{ width: `${laborPercent}%` }}
              title="Labor"
            />
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
              style={{ width: `${overheadPercent}%` }}
              title="Overhead"
            />
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${profitPercent}%` }}
              title="Profit"
            />
          </div>
          <div className="flex justify-between mt-2">
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <span className="text-neutral-600">Materials</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                <span className="text-neutral-600">Labor</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-neutral-600">Overhead (10%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-neutral-600">Profit (20%)</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Adjustment Controls */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Complexity Charge Card */}
        <div className="bg-white rounded-xl shadow-md border border-neutral-200 overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-orange-500 to-red-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white">Complexity Charge</h3>
                <p className="text-orange-100 text-xs">Difficult access, site conditions, etc.</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-semibold">$</span>
              <input
                type="number"
                value={painInTheAssCharge || ''}
                onChange={(e) => onPainInTheAssChargeChange(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-4 py-3 text-xl font-bold text-neutral-800 bg-neutral-50 border-2 border-neutral-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                placeholder="0.00"
                step="50"
                min="0"
              />
            </div>
            <div className="flex gap-2 mt-3">
              {[100, 250, 500, 1000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => onPainInTheAssChargeChange(amount)}
                  className={`flex-1 py-2 px-3 text-sm font-semibold rounded-lg transition-all ${
                    painInTheAssCharge === amount
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-orange-100 hover:text-orange-700'
                  }`}
                >
                  +${amount}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Permit Card */}
        <div className="bg-white rounded-xl shadow-md border border-neutral-200 overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-indigo-500 to-purple-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white">Building Permit</h3>
                <p className="text-indigo-100 text-xs">Required for structural work</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="flex gap-3">
              <button
                onClick={() => onPermitRequiredChange(false)}
                className={`flex-1 py-4 px-4 rounded-xl font-semibold transition-all ${
                  !permitRequired
                    ? 'bg-neutral-800 text-white shadow-lg'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                <span className="block text-lg">No Permit</span>
                <span className="block text-sm opacity-70">$0</span>
              </button>
              <button
                onClick={() => onPermitRequiredChange(true)}
                className={`flex-1 py-4 px-4 rounded-xl font-semibold transition-all ${
                  permitRequired
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-indigo-100 hover:text-indigo-700'
                }`}
              >
                <span className="block text-lg">Permit Required</span>
                <span className="block text-sm opacity-70">+$250</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Crew Info Banner */}
      <div className={`bg-gradient-to-r ${
        crewInfo.color === 'emerald' ? 'from-emerald-500 to-green-500' :
        crewInfo.color === 'blue' ? 'from-blue-500 to-cyan-500' :
        crewInfo.color === 'purple' ? 'from-purple-500 to-pink-500' :
        'from-neutral-400 to-neutral-500'
      } rounded-xl p-4 shadow-md`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white/80 text-xs font-medium uppercase tracking-wide">Assigned Crew</p>
              <p className="text-white font-bold text-lg">{crewInfo.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/80 text-xs font-medium">Hourly Rate</p>
            <p className="text-white font-bold text-2xl">${crewInfo.rate}/hr</p>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown Accordion */}
      <div className="bg-white rounded-xl shadow-md border border-neutral-200 overflow-hidden">
        <button
          onClick={() => setShowDetailedPricing(!showDetailedPricing)}
          className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-neutral-50 to-white hover:from-neutral-100 hover:to-neutral-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calculator className="w-5 h-5 text-blue-600" />
            </div>
            <span className="font-bold text-neutral-800">Detailed Cost Breakdown</span>
          </div>
          <div className={`p-1 rounded-lg bg-neutral-100 transition-transform duration-300 ${showDetailedPricing ? 'rotate-180' : ''}`}>
            <ChevronDown className="w-5 h-5 text-neutral-600" />
          </div>
        </button>

        {showDetailedPricing && (
          <div className="border-t border-neutral-100 divide-y divide-neutral-100 animate-fade-in">
            {/* Materials Section */}
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <h4 className="font-bold text-neutral-800 text-lg">Materials</h4>
                <span className="ml-auto text-2xl font-bold text-blue-600">
                  ${formatCurrency(calculateMaterialsTotal())}
                </span>
              </div>

              {getMaterialsBreakdown().length > 0 ? (
                <div className="space-y-2">
                  {getMaterialsBreakdown().map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-3 px-4 bg-blue-50 rounded-lg">
                      <div>
                        <p className="font-semibold text-neutral-800">{item.name}</p>
                        <p className="text-sm text-neutral-500">{item.quantity} {item.unit}</p>
                      </div>
                      <span className="font-bold text-blue-600">${formatCurrency(item.cost)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-500 text-sm italic py-4">No calculated materials - using manual entries only</p>
              )}

              {getTotalMaterialCosts() > 0 && (
                <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span className="font-semibold text-amber-800">Manual Material Entries</span>
                    </div>
                    <span className="font-bold text-amber-600">${formatCurrency(getTotalMaterialCosts())}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Labor Section */}
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Wrench className="w-5 h-5 text-purple-600" />
                </div>
                <h4 className="font-bold text-neutral-800 text-lg">Labor</h4>
                <span className="ml-auto text-2xl font-bold text-purple-600">
                  ${formatCurrency(calculateLaborTotal())}
                </span>
              </div>

              {getLaborBreakdown().length > 0 ? (
                <div className="space-y-2">
                  {getLaborBreakdown().map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-3 px-4 bg-purple-50 rounded-lg">
                      <div>
                        <p className="font-semibold text-neutral-800">{item.name}</p>
                        <p className="text-sm text-neutral-500">{item.hours} hrs @ ${item.rate}/hr</p>
                      </div>
                      <span className="font-bold text-purple-600">${formatCurrency(item.cost)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-500 text-sm italic py-4">No calculated labor - using manual entries only</p>
              )}

              {getTotalLaborHours() > 0 && (
                <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <div>
                        <span className="font-semibold text-amber-800">Manual Labor Hours</span>
                        <span className="text-sm text-amber-600 ml-2">
                          {getTotalLaborHours().toFixed(1)} hrs @ ${getHourlyRate()}/hr
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-amber-600">
                      ${formatCurrency(getTotalLaborHours() * getHourlyRate())}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Summary Section */}
            <div className="p-6 bg-gradient-to-b from-neutral-50 to-white">
              <h4 className="font-bold text-neutral-800 text-lg mb-4">Final Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between py-2">
                  <span className="text-neutral-600">Materials Subtotal</span>
                  <span className="font-semibold text-neutral-800">${formatCurrency(calculateMaterialsTotal())}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-neutral-600">Labor Subtotal</span>
                  <span className="font-semibold text-neutral-800">${formatCurrency(calculateLaborTotal())}</span>
                </div>
                <div className="h-px bg-neutral-200 my-2"></div>
                <div className="flex justify-between py-2">
                  <span className="text-neutral-600">Subtotal</span>
                  <span className="font-semibold text-neutral-800">
                    ${formatCurrency(calculateMaterialsTotal() + calculateLaborTotal())}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-neutral-600">Overhead (10%)</span>
                  <span className="font-semibold text-amber-600">${formatCurrency(calculateOverhead())}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-neutral-600">Profit (20%)</span>
                  <span className="font-semibold text-emerald-600">${formatCurrency(calculateProfit())}</span>
                </div>
                {permitRequired && (
                  <div className="flex justify-between py-2">
                    <span className="text-neutral-600">Permit Fee</span>
                    <span className="font-semibold text-indigo-600">$250.00</span>
                  </div>
                )}
                {painInTheAssCharge > 0 && (
                  <div className="flex justify-between py-2">
                    <span className="text-neutral-600">Complexity Charge</span>
                    <span className="font-semibold text-orange-600">${formatCurrency(painInTheAssCharge)}</span>
                  </div>
                )}
                <div className="h-px bg-neutral-300 my-2"></div>
                <div className="flex justify-between py-3 bg-emerald-100 rounded-xl px-4 -mx-4">
                  <span className="font-bold text-emerald-800 text-xl">Total Estimate</span>
                  <span className="font-black text-emerald-600 text-2xl">${formatCurrency(calculateEstimatedTotal())}</span>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="p-4 bg-amber-50 border-t border-amber-200">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> This is an automated estimate based on the information provided.
                  Final pricing may vary based on site conditions, material availability, and additional
                  requirements discovered during the project.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
