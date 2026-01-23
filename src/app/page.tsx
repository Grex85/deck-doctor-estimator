"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Camera,
  MapPin,
  Calendar,
  User,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  NotebookPen,
  Home,
  Ruler,
  Calculator,
  AlertTriangle,
  FileText,
  Download,
  Layers,
  BarChart,
  Building,
  ClipboardList,
  Save,
  Upload,
  X,
  DollarSign,
  Package
} from "lucide-react";
import { DrawingModal } from "@/components/drawing/DrawingModal";
import { DrawingGallery } from "@/components/drawing/DrawingGallery";
import { Drawing } from "@/components/drawing/types";
import { AssessmentSummary } from "@/components/estimator/AssessmentSummary";
import { PricingSummary } from "@/components/estimator/PricingSummary";
import { estimateDeckCost, CostBreakdown, MATERIAL_PRICES, LABOR_RATES } from "@/lib/pricing";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";

// ---------------------------
// Types
// ---------------------------
interface JobData {
  jobTypes: string[];
  estimatorName: string;
  visitDate: string;
  gpsLat: number;
  gpsLng: number;
  cityCode: string;
  liveLoad: number;
  snowLoad: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  projectAddress: string;
  sameAsCustomerAddress: boolean;
  permitRequired: boolean;
  projectValue: number;
  customerGrade: string;
  estimatorNotes: string;
  jobSpecificAnswers: Record<string, any>;
  generalNotes: string;
  measurementNotes: string;
  calculations: Record<string, any>;
  // Customer-facing questions
  newCustomer: boolean;
  referralSource: string;
  hasReferrals: boolean;
  referralInfo: string;
  needsSamples: boolean;
  sampleTypes: string;
  hasScheduleRequirements: boolean;
  scheduleRequirements: string;
  hasGateCode: boolean;
  gateCode: string;
  paintStainColors: string;
  painInTheAssCharge: number;
  assignedCrew: string; // "Alex" ($166/hr), "Huber" ($95/hr), or "Both"
}

interface UploadedFile {
  url: string;
  name: string;
  size: number;
  type: string;
  notes: string;
}

interface JobQuestion {
  id: string;
  question: string;
  type:
    | "text"
    | "number"
    | "select"
    | "checkbox"
    | "textarea"
    | "measurement"
    | "dimensions"
    | "linearfeet"
    | "multiple-dimensions"
    | "squarefeet"
    | "cubicyards"
    | "grid-measurement"
    | "calculation-display"
    | "material-list"
    | "span-chart"
    | "checkbox-multiple"
    | "select-with-other"
    | "condition-assessment"
    | "material-condition"
    | "repair-recommendation"
    | "add-more"
    | "date"
    | "range"
    | "file"
    | "radio"
    | "dynamic-sections"
    | "add-sections";
  options?: string[];
  required?: boolean;
  unit?: string;
  category?: string;
  dependency?: string;
  dependencyValue?: any;
  permitOnly?: boolean;
  calculation?: string;
  spanChart?: string;
  allowOther?: boolean;
  section?: "current" | "recommended";
  placeholder?: string;
  label?: string;
  perStructure?: boolean;
  min?: number;
  max?: number;
}

interface SpanChartData {
  lumber: string;
  spacing12: number;
  spacing16: number;
  spacing24: number;
  snowLoad20: number;
  snowLoad30: number;
  snowLoad40: number;
}

interface BeamSpanData {
  beam: string;
  postSpacing8: number;
  postSpacing10: number;
  postSpacing12: number;
  postSpacing14: number;
  postSpacing16: number;
  snowLoad30: number;
}

interface CantileverData {
  lumber: string;
  cantilever12: number;
  cantilever16: number;
  cantilever24: number;
  maxSafe: number;
}

interface ValidationError {
  field: string;
  message: string;
}

interface MaterialCondition {
  condition?: string;
  notes?: string;
  measurements?: string;
}

interface RepairRecommendation {
  description?: string;
  priority?: string;
  cost_estimate?: string;
}

interface AddMoreItem {
  id: string;
  description?: string;
  quantity?: number;
  unit?: string;
  [key: string]: any;
}

interface ConditionAssessment {
  condition: string;
  notes: string;
}

interface InsulationMaterial {
  type: string;
  rPerInch: number;
  costPerSqFt: string;
}

interface InsulationRValues {
  colorado: {
    walls: number;
    attic: number;
    floor: number;
    basement: number;
  };
  materials: InsulationMaterial[];
}

// ---------------------------
// Reference Data & Charts
// ---------------------------
const COLORADO_SPAN_CHARTS: SpanChartData[] = [
  { lumber: "2x6", spacing12: 9.5, spacing16: 8.7, spacing24: 7.5, snowLoad20: 9.5, snowLoad30: 8.7, snowLoad40: 7.9 },
  { lumber: "2x8", spacing12: 12.5, spacing16: 11.4, spacing24: 9.8, snowLoad20: 12.5, snowLoad30: 11.4, snowLoad40: 10.4 },
  { lumber: "2x10", spacing12: 15.9, spacing16: 14.5, spacing24: 12.5, snowLoad20: 15.9, snowLoad30: 14.5, snowLoad40: 13.2 },
  { lumber: "2x12", spacing12: 19.3, spacing16: 17.6, spacing24: 15.1, snowLoad20: 19.3, snowLoad30: 17.6, snowLoad40: 16.0 },
  { lumber: "LVL 1.75x9.25", spacing12: 16.2, spacing16: 14.8, spacing24: 12.7, snowLoad20: 16.2, snowLoad30: 14.8, snowLoad40: 13.5 },
  { lumber: "LVL 1.75x11.25", spacing12: 19.8, spacing16: 18.1, spacing24: 15.6, snowLoad20: 19.8, snowLoad30: 18.1, snowLoad40: 16.4 },
  { lumber: "LVL 1.75x14", spacing12: 24.6, spacing16: 22.4, spacing24: 19.3, snowLoad20: 24.6, snowLoad30: 22.4, snowLoad40: 20.3 },
  { lumber: "LVL 1.75x16", spacing12: 28.1, spacing16: 25.6, spacing24: 22.0, snowLoad20: 28.1, snowLoad30: 25.6, snowLoad40: 23.2 },
];

const COLORADO_BEAM_SPANS: BeamSpanData[] = [
  { beam: "Double 2x10", postSpacing8: 8.0, postSpacing10: 7.2, postSpacing12: 6.5, postSpacing14: 5.9, postSpacing16: 5.4, snowLoad30: 6.5 },
  { beam: "Double 2x12", postSpacing8: 9.8, postSpacing10: 8.8, postSpacing12: 8.0, postSpacing14: 7.3, postSpacing16: 6.7, snowLoad30: 8.0 },
  { beam: "LVL 1.75x9.25", postSpacing8: 9.2, postSpacing10: 8.3, postSpacing12: 7.5, postSpacing14: 6.9, postSpacing16: 6.3, snowLoad30: 7.5 },
  { beam: "LVL 1.75x11.25", postSpacing8: 11.3, postSpacing10: 10.2, postSpacing12: 9.2, postSpacing14: 8.4, postSpacing16: 7.7, snowLoad30: 9.2 },
  { beam: "LVL 1.75x14", postSpacing8: 14.0, postSpacing10: 12.6, postSpacing12: 11.4, postSpacing14: 10.4, postSpacing16: 9.6, snowLoad30: 11.4 },
  { beam: "LVL 1.75x16", postSpacing8: 16.0, postSpacing10: 14.4, postSpacing12: 13.0, postSpacing14: 11.9, postSpacing16: 10.9, snowLoad30: 13.0 },
  { beam: "Glulam 5.125x12", postSpacing8: 15.2, postSpacing10: 13.7, postSpacing12: 12.4, postSpacing14: 11.3, postSpacing16: 10.4, snowLoad30: 12.4 },
];

const COLORADO_CODES = {
  frostLineDepth: 42,
  snowLoad: 30,
  windSpeed: 105,
  seismicZone: "Low",
  setbackRequirements: { front: 25, side: 10, rear: 15 },
  heightLimits: { residential: 35, accessory: 20 },
};

const COLORADO_CANTILEVER_SPANS: CantileverData[] = [
  { lumber: "2x8", cantilever12: 2.4, cantilever16: 2.2, cantilever24: 1.9, maxSafe: 2.4 },
  { lumber: "2x10", cantilever12: 3.0, cantilever16: 2.8, cantilever24: 2.4, maxSafe: 3.0 },
  { lumber: "2x12", cantilever12: 3.6, cantilever16: 3.3, cantilever24: 2.9, maxSafe: 3.6 },
  { lumber: "LVL 1.75x9.25", cantilever12: 2.8, cantilever16: 2.6, cantilever24: 2.2, maxSafe: 2.8 },
  { lumber: "LVL 1.75x11.25", cantilever12: 3.4, cantilever16: 3.1, cantilever24: 2.7, maxSafe: 3.4 },
  { lumber: "LVL 1.75x14", cantilever12: 4.2, cantilever16: 3.9, cantilever24: 3.4, maxSafe: 4.2 },
  { lumber: "LVL 1.75x16", cantilever12: 4.8, cantilever16: 4.4, cantilever24: 3.9, maxSafe: 4.8 },
  { lumber: "LVL 1.75x18", cantilever12: 5.4, cantilever16: 5.0, cantilever24: 4.4, maxSafe: 5.4 },
  { lumber: "Engineered I-Joist 11.875", cantilever12: 4.5, cantilever16: 4.1, cantilever24: 3.6, maxSafe: 4.5 },
  { lumber: "Engineered I-Joist 14", cantilever12: 5.2, cantilever16: 4.8, cantilever24: 4.2, maxSafe: 5.2 },
  { lumber: "Steel Beam W8x10", cantilever12: 8.0, cantilever16: 7.5, cantilever24: 6.8, maxSafe: 8.0 },
  { lumber: "Steel Beam W10x12", cantilever12: 10.5, cantilever16: 9.8, cantilever24: 8.9, maxSafe: 10.5 },
  { lumber: "Engineered Truss System", cantilever12: 12.0, cantilever16: 11.2, cantilever24: 10.0, maxSafe: 12.0 },
];

const DECK_BOARD_FACE_INCHES: Record<string, number> = {
  "Composite 5.5\"": 5.5,
  "Cedar 5.5\"": 5.5,
  "PT Pine 5.5\"": 5.5,
  "Composite 6\"": 6.0,
  "Cedar 6\"": 6.0,
};

const INSULATION_RVALUES: InsulationRValues = {
  colorado: {
    walls: 20,
    attic: 49,
    floor: 30,
    basement: 15
  },
  materials: [
    { type: "Fiberglass Batts", rPerInch: 3.2, costPerSqFt: "$0.64-1.19" },
    { type: "Spray Foam (Closed)", rPerInch: 6.0, costPerSqFt: "$1.36-2.42" },
    { type: "Spray Foam (Open)", rPerInch: 3.7, costPerSqFt: "$0.44-0.65" },
    { type: "Rigid Foam", rPerInch: 5.0, costPerSqFt: "$0.25-2.00" }
  ]
};

const WIRE_GAUGE_CHART = [
  { amperage: "15A", wireGauge: "14 AWG", application: "Lighting, outlets", breaker: "15A" },
  { amperage: "20A", wireGauge: "12 AWG", application: "Kitchen, bathroom outlets", breaker: "20A" },
  { amperage: "30A", wireGauge: "10 AWG", application: "Electric dryer, A/C", breaker: "30A" },
  { amperage: "40A", wireGauge: "8 AWG", application: "Electric range", breaker: "40A" },
  { amperage: "50A", wireGauge: "6 AWG", application: "Electric panel sub-feed", breaker: "50A" }
];

const FASTENER_GUIDE = {
  deckFraming: [
    { application: "Joist to Beam", fastener: "2.5\" GRK screws or 3\" deck screws", spacing: "Every 16\"" },
    { application: "Joist Hangers", fastener: "1.25\" joist hanger nails", quantity: "Per manufacturer" },
    { application: "Rim Joist", fastener: "3\" construction screws", spacing: "16\" OC" }
  ],
  jamesHardie: [
    { application: "Siding Installation", fastener: "1.25\" roofing nails", spacing: "6\" OC" },
    { application: "Trim Boards", fastener: "2\" stainless steel finish nails", spacing: "16\" OC" },
    { application: "Soffit/Fascia", fastener: "1.25\" roofing nails", spacing: "12\" OC" }
  ],
  roofing: [
    { application: "Asphalt Shingles", fastener: "1.25\" roofing nails", quantity: "6 per shingle" },
    { application: "Metal Roofing", fastener: "1.5\" metal roofing screws", spacing: "12\" OC" },
    { application: "Underlayment", fastener: "Cap nails", spacing: "6\" OC" }
  ]
};

const LUMBER_GRADES = [
  { grade: "Construction", use: "Structural framing, joists, beams", strength: "High", price: "$$" },
  { grade: "Standard", use: "General framing, studs", strength: "Medium", price: "$" },
  { grade: "Stud", use: "Wall framing, non-load bearing", strength: "Medium", price: "$" },
  { grade: "Utility", use: "Blocking, temporary bracing", strength: "Low", price: "$" }
];

const PAINT_COVERAGE_CHART = {
  primer: [
    { type: "Latex Primer", coverage: "350-400 sq ft/gal", dryTime: "2-4 hours", use: "Interior walls" },
    { type: "Oil-Based Primer", coverage: "300-350 sq ft/gal", dryTime: "6-8 hours", use: "Exterior trim" },
    { type: "Stain-Blocking Primer", coverage: "250-300 sq ft/gal", dryTime: "1-2 hours", use: "Problem areas" }
  ],
  paint: [
    { type: "Interior Latex", coverage: "400-450 sq ft/gal", coats: "2", durability: "5-10 years" },
    { type: "Exterior Latex", coverage: "350-400 sq ft/gal", coats: "2", durability: "7-12 years" },
    { type: "Wood Iron Premium", coverage: "175-200 sq ft/gal", coats: "2", durability: "8-15 years" },
    { type: "Wood Iron Semi-Solid", coverage: "200-225 sq ft/gal", coats: "2", durability: "6-12 years" }
  ]
};

const RETAINING_WALL_BLOCKS = [
  { type: "Standard Concrete Block", coverage: "1.5 blocks/sq ft", maxHeight: "3 feet", cost: "$2-4/sq ft" },
  { type: "Interlocking Block", coverage: "1.2 blocks/sq ft", maxHeight: "6 feet", cost: "$8-15/sq ft" },
  { type: "Natural Stone", coverage: "varies", maxHeight: "4 feet", cost: "$15-30/sq ft" },
  { type: "Timber/Railroad Ties", coverage: "0.5 ties/linear ft", maxHeight: "3 feet", cost: "$12-20/sq ft" }
];

const COLORADO_PRICING_GUIDE = {
  decks: { range: "$25-65/sq ft", timeline: "1-3 weeks", notes: "Varies by material/complexity" },
  patios: { range: "$8-25/sq ft", timeline: "3-7 days", notes: "Concrete to high-end pavers" },
  driveways: { range: "$5-15/sq ft", timeline: "2-5 days", notes: "Asphalt to decorative concrete" },
  fencing: { range: "$15-45/linear ft", timeline: "1-2 weeks", notes: "Chain link to cedar privacy" },
  siding: { range: "$12-18/sq ft", timeline: "1-2 weeks", notes: "James Hardie installation" },
  roofing: { range: "$8-20/sq ft", timeline: "1-3 days", notes: "Asphalt to metal roofing" },
  painting: { range: "$2-8/sq ft", timeline: "2-5 days", notes: "Interior to premium exterior" }
};

// Chart display components (moved before main component so they're available)
const SpanChart = ({ lumber }: { lumber: string }) => {
  const chartData = COLORADO_SPAN_CHARTS.find((c) => c.lumber === lumber);
  if (!chartData) return <div>Span data not available for {lumber}</div>;

  return (
    <div className="bg-white p-4 rounded-lg border-2 border-blue-300 shadow-sm">
      <h4 className="font-bold text-gray-900 mb-3 text-lg">
        {lumber} Joist Spans (Colorado Snow Load)
        {lumber.startsWith("LVL") && (
          <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
            Engineered Lumber
          </span>
        )}
      </h4>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="p-2 bg-blue-50 rounded">
          <p className="font-bold text-gray-900 mb-1">Joist Spacing</p>
          <p className="text-gray-800 font-medium">12" OC: <span className="font-bold text-blue-700">{chartData.spacing12}'</span></p>
          <p className="text-gray-800 font-medium">16" OC: <span className="font-bold text-blue-700">{chartData.spacing16}'</span></p>
          <p className="text-gray-800 font-medium">24" OC: <span className="font-bold text-blue-700">{chartData.spacing24}'</span></p>
        </div>
        <div className="p-2 bg-green-50 rounded">
          <p className="font-bold text-gray-900 mb-1">Snow Load (psf)</p>
          <p className="text-gray-800 font-medium">20 psf: <span className="font-bold text-green-700">{chartData.snowLoad20}'</span></p>
          <p className="text-gray-800 font-medium">30 psf: <span className="font-bold text-green-700">{chartData.snowLoad30}'</span></p>
          <p className="text-gray-800 font-medium">40 psf: <span className="font-bold text-green-700">{chartData.snowLoad40}'</span></p>
        </div>
        <div className="bg-yellow-100 p-3 rounded border-2 border-yellow-400">
          <p className="font-bold text-gray-900 text-sm">Golden, CO</p>
          <p className="text-gray-800 font-medium text-sm">30 psf snow load</p>
          <p className="text-gray-800 font-medium text-sm">105 mph wind</p>
        </div>
      </div>
    </div>
  );
};

const CantileverChart = ({ lumber }: { lumber: string }) => {
  const chartData = COLORADO_CANTILEVER_SPANS.find((c) => c.lumber === lumber);
  if (!chartData) return <div>Cantilever data not available for {lumber}</div>;

  const isExtended = chartData.maxSafe > 6;
  const isEngineered = lumber.includes("Steel") || lumber.includes("Engineered") || lumber.includes("LVL");

  return (
    <div className={`bg-white p-4 rounded-lg border-2 shadow-sm ${isExtended ? 'border-red-300' : 'border-purple-300'}`}>
      <h4 className="font-bold text-gray-900 mb-3 text-lg">
        {lumber} Cantilever Spans (Colorado)
        {isEngineered && (
          <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
            Engineered
          </span>
        )}
        {isExtended && (
          <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
            Extended Range
          </span>
        )}
      </h4>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="p-2 bg-purple-50 rounded">
          <p className="font-bold text-gray-900 mb-1">Joist Spacing</p>
          <p className="text-gray-800 font-medium">12" OC: <span className="font-bold text-purple-700">{chartData.cantilever12}'</span></p>
          <p className="text-gray-800 font-medium">16" OC: <span className="font-bold text-purple-700">{chartData.cantilever16}'</span></p>
          <p className="text-gray-800 font-medium">24" OC: <span className="font-bold text-purple-700">{chartData.cantilever24}'</span></p>
        </div>
        <div className="p-2 bg-red-50 rounded">
          <p className="font-bold text-gray-900 mb-1">Maximum Safe</p>
          <p className="text-gray-800 font-medium">CO Code: <span className="font-bold text-red-700">{chartData.maxSafe}'</span></p>
          {isExtended ? (
            <p className="text-red-600 font-bold text-xs">⚠️ PROFESSIONAL REVIEW RECOMMENDED</p>
          ) : (
            <p className="text-gray-800 font-medium text-xs">⚠️ Beyond beam only</p>
          )}
          <p className="text-gray-800 font-medium text-xs">Not cantilever columns</p>
        </div>
        <div className={`p-3 rounded border-2 ${isExtended ? 'bg-red-100 border-red-400' : 'bg-yellow-100 border-yellow-400'}`}>
          <p className="font-bold text-gray-900 text-sm">
            {isExtended ? 'Extended Cantilever' : 'Cantilever Rules'}
          </p>
          {isExtended ? (
            <>
              <p className="text-red-800 font-bold text-sm">Professional consultation recommended</p>
              <p className="text-red-800 font-medium text-sm">Check local permit requirements</p>
              <p className="text-red-800 font-medium text-sm">Enhanced support needed</p>
            </>
          ) : (
            <>
              <p className="text-gray-800 font-medium text-sm">Max 2-3 feet typical</p>
              <p className="text-gray-800 font-medium text-sm">Requires beam support</p>
              <p className="text-gray-800 font-medium text-sm">30 psf snow load</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const BeamSpanChart = ({ beam }: { beam: string }) => {
  const chartData = COLORADO_BEAM_SPANS.find((c) => c.beam === beam);
  if (!chartData) return <div>Beam span data not available for {beam}</div>;

  return (
    <div className="bg-white p-4 rounded-lg border-2 border-orange-300 shadow-sm">
      <h4 className="font-bold text-gray-900 mb-3 text-lg">
        {beam} Beam Spans (Colorado Snow Load)
        {(beam.startsWith("LVL") || beam.startsWith("Glulam") || beam.startsWith("Steel") || beam.startsWith("Alaskan") || beam.startsWith("Treated")) && (
          <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium">
            Engineered
          </span>
        )}
      </h4>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="p-2 bg-orange-50 rounded">
          <p className="font-bold text-gray-900 mb-1">Column Spacing</p>
          <p className="text-gray-800 font-medium">8 ft: <span className="font-bold text-orange-700">{chartData.postSpacing8}'</span></p>
          <p className="text-gray-800 font-medium">10 ft: <span className="font-bold text-orange-700">{chartData.postSpacing10}'</span></p>
          <p className="text-gray-800 font-medium">12 ft: <span className="font-bold text-orange-700">{chartData.postSpacing12}'</span></p>
        </div>
        <div className="p-2 bg-red-50 rounded">
          <p className="font-bold text-gray-900 mb-1">Column Spacing</p>
          <p className="text-gray-800 font-medium">14 ft: <span className="font-bold text-red-700">{chartData.postSpacing14}'</span></p>
          <p className="text-gray-800 font-medium">16 ft: <span className="font-bold text-red-700">{chartData.postSpacing16}'</span></p>
          <p className="text-gray-800 font-medium font-bold">CO 30psf: <span className="font-bold text-red-800">{chartData.snowLoad30}'</span></p>
        </div>
        <div className="bg-yellow-100 p-3 rounded border-2 border-yellow-400">
          <p className="font-bold text-gray-900 text-sm">Beam Load Info</p>
          <p className="text-gray-800 font-medium text-sm">Tributary area</p>
          <p className="text-gray-800 font-medium text-sm">Live + Snow loads</p>
          <p className="text-gray-800 font-medium text-sm">L/240 deflection</p>
        </div>
      </div>
    </div>
  );
};

const PaintCoverageChart = () => (
  <div className="bg-white p-4 rounded-lg border-2 border-green-300 shadow-sm">
    <h4 className="font-bold text-gray-900 mb-3 text-lg">Paint & Stain Coverage Chart</h4>
    <div className="space-y-3 text-sm">
      <div>
        <h5 className="font-semibold text-gray-800 mb-2">Primers</h5>
        {PAINT_COVERAGE_CHART.primer.map((item, index) => (
          <div key={index} className="p-2 rounded bg-gray-50 mb-1">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-800">{item.type}</span>
              <span className="text-blue-700 font-bold">{item.coverage}</span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Dry Time: {item.dryTime} | Use: {item.use}
            </div>
          </div>
        ))}
      </div>
      <div>
        <h5 className="font-semibold text-gray-800 mb-2">Paint & Stains</h5>
        {PAINT_COVERAGE_CHART.paint.map((item, index) => (
          <div key={index} className={`p-2 rounded ${item.type.includes('Wood Iron') ? 'bg-green-50 border border-green-200' : 'bg-gray-50'} mb-1`}>
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-800">{item.type}</span>
              <span className="text-blue-700 font-bold">{item.coverage}</span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Durability: {item.durability} | Coats: {item.coats}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const RetainingWallChart = () => (
  <div className="bg-white p-4 rounded-lg border-2 border-brown-300 shadow-sm">
    <h4 className="font-bold text-gray-900 mb-3 text-lg">Retaining Wall Block Guide</h4>
    <div className="space-y-2 text-sm">
      {RETAINING_WALL_BLOCKS.map((block, index) => (
        <div key={index} className="p-2 bg-amber-50 rounded border">
          <div className="font-medium text-gray-800">{block.type}</div>
          <div className="text-xs text-gray-600 mt-1">
            Coverage: {block.coverage} | Max Height: {block.maxHeight} | Cost: {block.cost}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const InsulationChart = () => (
  <div className="bg-white p-4 rounded-lg border-2 border-blue-300 shadow-sm">
    <h4 className="font-bold text-gray-900 mb-3 text-lg">Insulation R-Values (Colorado)</h4>
    <div className="space-y-2 text-sm">
      {INSULATION_RVALUES.materials.map((material, index) => (
        <div key={index} className="p-2 bg-blue-50 rounded">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-800">{material.type}</span>
            <span className="text-blue-700 font-bold">R-{material.rPerInch}/inch</span>
          </div>
          <div className="text-xs text-gray-600 mt-1">Cost: {material.costPerSqFt}</div>
        </div>
      ))}
    </div>
  </div>
);

const WireGaugeChart = () => (
  <div className="bg-white p-4 rounded-lg border-2 border-yellow-300 shadow-sm">
    <h4 className="font-bold text-gray-900 mb-3 text-lg">Electrical Wire Gauge Chart</h4>
    <div className="space-y-2 text-sm">
      {WIRE_GAUGE_CHART.map((data, index) => (
        <div key={index} className="p-2 bg-yellow-50 rounded border">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-800">{data.amperage}</span>
            <span className="text-yellow-700 font-bold">{data.wireGauge}</span>
          </div>
          <div className="text-xs text-gray-600 mt-1">{data.application} | Breaker: {data.breaker}</div>
        </div>
      ))}
    </div>
  </div>
);

const FastenerGuideChart = () => (
  <div className="bg-white p-4 rounded-lg border-2 border-purple-300 shadow-sm">
    <h4 className="font-bold text-gray-900 mb-3 text-lg">Fastener Selection Guide</h4>
    <div className="space-y-3 text-sm">
      {Object.entries(FASTENER_GUIDE).map(([category, items]) => (
        <div key={category} className="mb-3">
          <h5 className="font-semibold text-gray-800 mb-2 capitalize">{category.replace(/([A-Z])/g, ' $1').trim()}</h5>
          {Array.isArray(items) && items.map((item, index) => (
            <div key={index} className="p-2 bg-purple-50 rounded border mb-1">
              <div className="font-medium text-gray-800">{item.application}</div>
              <div className="text-purple-700 font-bold">{item.fastener}{(item as any).spacing ? ` - ${(item as any).spacing}` : ''}{(item as any).quantity ? ` (${(item as any).quantity})` : ''}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

const LumberGradeChart = () => (
  <div className="bg-white p-4 rounded-lg border-2 border-green-300 shadow-sm">
    <h4 className="font-bold text-gray-900 mb-3 text-lg">Lumber Grade Guide</h4>
    <div className="space-y-2 text-sm">
      {LUMBER_GRADES.map((grade, index) => (
        <div key={index} className="p-2 bg-green-50 rounded border">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-800">{grade.grade}</span>
            <span className="text-green-700 font-bold">{grade.price}</span>
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {grade.use} | Strength: {grade.strength}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Phone number formatting helper
const formatPhoneNumber = (value: string): string => {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');

  // Format as (XXX) XXX-XXXX
  if (digits.length <= 3) {
    return digits;
  } else if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  } else {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
};

// Address Autocomplete Component - using Autocomplete Service for better React compatibility
const AddressAutocomplete = ({
  value,
  onChange,
  placeholder,
  className,
  googlePlacesLoaded
}: {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
  className?: string;
  googlePlacesLoaded?: boolean;
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const selectionMade = useRef(false);

  // Initialize services when Google loads
  useEffect(() => {
    if (googlePlacesLoaded && window.google?.maps?.places) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
      // PlacesService needs a DOM element or map
      const div = document.createElement('div');
      placesService.current = new window.google.maps.places.PlacesService(div);
    }
  }, [googlePlacesLoaded]);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = (input: string) => {
    if (!autocompleteService.current || input.length < 3) {
      setSuggestions([]);
      return;
    }

    autocompleteService.current.getPlacePredictions(
      {
        input,
        types: ['address'],
        componentRestrictions: { country: 'us' }
      },
      (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
        }
      }
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Debounce API calls
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  const handleSelectSuggestion = (placeId: string, description: string) => {
    selectionMade.current = true;
    if (placesService.current) {
      placesService.current.getDetails(
        { placeId, fields: ['formatted_address'] },
        (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.formatted_address) {
            setInputValue(place.formatted_address);
            onChange(place.formatted_address);
          } else {
            setInputValue(description);
            onChange(description);
          }
          setSuggestions([]);
          setShowSuggestions(false);
        }
      );
    } else {
      setInputValue(description);
      onChange(description);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      if (selectionMade.current) {
        selectionMade.current = false;
        return;
      }
      onChange(inputValue);
      setShowSuggestions(false);
    }, 200);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-auto">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.place_id}
              className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-gray-900 border-b border-gray-100 last:border-b-0"
              onMouseDown={() => handleSelectSuggestion(suggestion.place_id, suggestion.description)}
            >
              {suggestion.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default function ProfessionalEstimatorPage() {
  // State
  const [jobData, setJobData] = useState<JobData>({
    jobTypes: [],
    estimatorName: "",
    visitDate: "",
    gpsLat: 0,
    gpsLng: 0,
    cityCode: "",
    liveLoad: 0,
    snowLoad: 0,
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerAddress: "",
    projectAddress: "",
    sameAsCustomerAddress: false,
    permitRequired: false,
    projectValue: 0,
    customerGrade: "",
    estimatorNotes: "",
    jobSpecificAnswers: {},
    generalNotes: "",
    measurementNotes: "",
    calculations: {},
    // Customer-facing questions
    newCustomer: true,
    referralSource: "",
    hasReferrals: false,
    referralInfo: "",
    needsSamples: false,
    sampleTypes: "",
    hasScheduleRequirements: false,
    scheduleRequirements: "",
    hasGateCode: false,
    gateCode: "",
    paintStainColors: "",
    painInTheAssCharge: 0,
    assignedCrew: "",
  });

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showNotes, setShowNotes] = useState<Record<string, boolean>>({});
  const [showCalculations, setShowCalculations] = useState(false);
  const [showSpanCharts, setShowSpanCharts] = useState(false);
  const [showReferenceCharts, setShowReferenceCharts] = useState(false);
  const [showDecoratorsColors, setShowDecoratorsColors] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [showDrawingModal, setShowDrawingModal] = useState(false);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [customerHistory, setCustomerHistory] = useState<any[]>([]);
  const [showCustomerHistory, setShowCustomerHistory] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [googlePlacesLoaded, setGooglePlacesLoaded] = useState(false);

  // ---------------------------
  // Job type categories
  // ---------------------------
  const jobTypeCategories = {
    Decks: {
      subcategories: ["New Build", "Repair", "Refinishing", "Replace Existing / Addition"],
      components: ["Hand Railing", "Deck Stairs", "Decking", "Deck Frame", "Electrical/Lighting", "Built-ins"],
    },
    Pergolas: {
      subcategories: ["New Build", "Repair", "Refinishing", "Replace Existing / Addition"],
      components: ["Posts", "Beams", "Rafters", "Roofing/Cover", "Automated Louvers", "Electrical", "Electrical Heaters", "Screening"],
    },
    Hardscaping: {
      subcategories: ["New Build", "Repair", "Replacement", "Replace Existing / Addition"],
      components: ["Base Preparation", "Paver Installation", "Edge Restraints", "Drainage", "Steps", "Lighting"],
    },
    "Retaining Walls": {
      subcategories: ["New Build", "Repair", "Reinforcement", "Replace Existing / Addition"],
      components: ["Foundation", "Block/Stone", "Drainage", "Backfill", "Geogrid", "Terracing"],
    },
    Roofs: {
      subcategories: ["New Build", "Repair", "Replacement", "Replace Existing / Addition"],
      components: ["Decking", "Underlayment", "Shingles/Material", "Flashing", "Gutters", "Ventilation"],
    },
    Painting: {
      subcategories: ["Interior", "Exterior"],
      components: ["Surface Prep", "Primer", "Paint/Stain", "Trim Work", "Cleanup", "Color Consultation"],
    },
  } as const;

  // Helper function to get current condition questions for job types
  const getCurrentConditionQuestions = (category: string): JobQuestion[] => {
    const conditionQuestions: Record<string, JobQuestion[]> = {
      Decks: [
        { id: "current_decking_material", question: "Current decking material", type: "select-with-other", options: ["Pressure Treated Pine", "Cedar", "Redwood", "Hardwood", "Composite", "Unknown/Mixed"], required: true, category: "Current Materials", section: "current", allowOther: true },
        { id: "current_decking_condition", question: "Decking condition", type: "select-with-other", options: ["Excellent", "Good", "Fair", "Poor", "Failed"], category: "Current Assessment", section: "current", required: true, allowOther: true },
        { id: "current_fasteners_maintenance", question: "Do fasteners need maintenance?", type: "checkbox-multiple", options: ["Yes", "No"], category: "Current Assessment", section: "current" },
        { id: "current_fasteners_sqft", question: "Square footage of fasteners needing maintenance", type: "number", unit: "sq ft", category: "Current Assessment", section: "current", dependency: "current_fasteners_maintenance", dependencyValue: true },
        { id: "current_stairs_condition", question: "Stairs condition", type: "select-with-other", options: ["Excellent", "Good", "Fair", "Poor", "Failed", "No stairs"], category: "Current Assessment", section: "current", allowOther: true },
        { id: "current_stair_railing_condition", question: "Stair railing condition", type: "select-with-other", options: ["Excellent", "Good", "Fair", "Poor", "Failed", "No stair railings"], category: "Current Assessment", section: "current", allowOther: true },
        { id: "current_railing_condition", question: "Hand railing condition", type: "select-with-other", options: ["Excellent", "Good", "Fair", "Poor", "Failed", "No railings"], category: "Current Assessment", section: "current", allowOther: true },
        { id: "current_stain_paint_color", question: "Current stain/paint color", type: "text", category: "Current Finish", section: "current" },
        { id: "multiple_colors", question: "More than one stain/paint color?", type: "checkbox-multiple", options: ["Yes", "No"], category: "Current Finish", section: "current" },
        { id: "current_stain_paint_color_2", question: "Second stain/paint color", type: "text", category: "Current Finish", section: "current", dependency: "multiple_colors", dependencyValue: true },
        { id: "current_stain_paint_condition", question: "Current stain/paint condition", type: "select-with-other", options: ["Excellent", "Good", "Fair", "Poor", "Bare wood"], category: "Current Finish", section: "current", allowOther: true },
      ],
      Pergolas: [
        { id: "current_pergola_material", question: "Current pergola material", type: "select-with-other", options: ["Pressure Treated Pine", "Cedar", "Composite", "Aluminum", "Steel", "Vinyl", "Unknown"], required: true, category: "Current Materials", section: "current", allowOther: true },
        { id: "current_pergola_condition", question: "Pergola condition", type: "material-condition", category: "Current Assessment", section: "current", required: true },
        { id: "current_post_material", question: "Current post material", type: "select-with-other", options: ["Pressure Treated Pine", "Cedar", "Steel", "Aluminum", "Composite", "Concrete"], category: "Current Materials", section: "current", allowOther: true },
        { id: "current_post_condition", question: "Post condition", type: "material-condition", category: "Current Assessment", section: "current" },
        { id: "current_roofing_material", question: "Current roofing/cover material", type: "select-with-other", options: ["None (open)", "Polycarbonate panels", "Canvas/Fabric", "Metal roofing", "Wood slats", "Vinyl"], category: "Current Materials", section: "current", allowOther: true },
      ],
      Hardscaping: [
        { id: "current_patio_material", question: "Current patio/walkway material", type: "select-with-other", options: ["Concrete", "Pavers (brick)", "Pavers (concrete)", "Natural stone", "Flagstone", "Gravel", "Asphalt", "Unknown"], required: true, category: "Current Materials", section: "current", allowOther: true },
        { id: "current_patio_condition", question: "Hardscape condition", type: "material-condition", category: "Current Assessment", section: "current", required: true },
        { id: "current_drainage", question: "Current drainage condition", type: "select-with-other", options: ["Excellent - no issues", "Good - minor pooling", "Fair - some drainage problems", "Poor - major water issues"], category: "Current Assessment", section: "current", allowOther: true },
        { id: "current_edge_restraints", question: "Current edge restraint condition", type: "select-with-other", options: ["Good condition", "Minor damage", "Significant damage", "Missing/None"], category: "Current Assessment", section: "current", allowOther: true },
        { id: "current_hardscape_issues", question: "Issues observed", type: "checkbox-multiple", options: ["Cracking", "Settling/uneven", "Weed growth", "Loose pavers", "Poor drainage", "Staining"], category: "Current Assessment", section: "current", allowOther: true },
      ],
      "Retaining Walls": [
        { id: "current_wall_material", question: "Current wall material", type: "select-with-other", options: ["Concrete block", "Natural stone", "Segmental retaining wall blocks", "Timber", "Poured concrete", "Boulder/Rock", "Unknown"], required: true, category: "Current Materials", section: "current", allowOther: true },
        { id: "current_wall_condition", question: "Wall condition", type: "material-condition", category: "Current Assessment", section: "current", required: true },
        { id: "current_wall_height", question: "Current wall height", type: "select-with-other", options: ["Under 2 feet", "2-3 feet", "3-4 feet", "4-6 feet", "Over 6 feet"], category: "Current Measurements", section: "current", allowOther: true },
        { id: "current_drainage_system", question: "Current drainage system", type: "select-with-other", options: ["French drain behind wall", "Weep holes", "Gravel backfill", "No drainage visible", "Unknown"], category: "Current Systems", section: "current", allowOther: true },
        { id: "current_wall_issues", question: "Wall issues observed", type: "checkbox-multiple", options: ["Bulging/bowing", "Cracking", "Settlement", "Poor drainage", "Erosion", "Missing blocks/stones"], category: "Current Assessment", section: "current", allowOther: true },
      ],
      Roofs: [
        { id: "current_roof_material", question: "Current roofing material", type: "select-with-other", options: ["Asphalt shingles", "Metal roofing", "Tile", "Slate", "TPO/EPDM", "Wood shakes", "Unknown"], required: true, category: "Current Materials", section: "current", allowOther: true },
        { id: "current_roof_condition", question: "Roof condition", type: "material-condition", category: "Current Assessment", section: "current", required: true },
        { id: "current_roof_age", question: "Estimated roof age", type: "select-with-other", options: ["Under 5 years", "5-10 years", "10-15 years", "15-20 years", "Over 20 years", "Unknown"], category: "Current Assessment", section: "current", allowOther: true },
        { id: "current_gutter_material", question: "Current gutter material", type: "select-with-other", options: ["Aluminum", "Steel", "Copper", "Vinyl", "None", "Unknown"], category: "Current Systems", section: "current", allowOther: true },
        { id: "current_roof_issues", question: "Roof issues observed", type: "checkbox-multiple", options: ["Missing shingles", "Granule loss", "Cracked/damaged shingles", "Gutter damage", "Flashing issues", "Ventilation problems"], category: "Current Assessment", section: "current", allowOther: true },
      ],
      Painting: [
        { id: "current_paint_type", question: "Current paint/finish type", type: "select-with-other", options: ["Latex paint", "Oil-based paint", "Wood Iron Premium", "Wood Iron Semi-Solid", "Solid stain", "Semi-transparent stain", "Bare wood", "Unknown"], required: true, category: "Current Condition", section: "current", allowOther: true },
        { id: "current_paint_condition", question: "Paint condition", type: "material-condition", category: "Current Assessment", section: "current", required: true },
        { id: "current_surface_prep_needed", question: "Surface prep needed", type: "checkbox-multiple", options: ["Power washing", "Scraping", "Sanding", "Caulking", "Priming", "Repair work"], category: "Current Assessment", section: "current", allowOther: true },
        { id: "last_painted", question: "When was it last painted?", type: "select-with-other", options: ["Within 2 years", "2-5 years ago", "5-10 years ago", "Over 10 years", "Never/Unknown"], category: "Paint History", section: "current", allowOther: true },
      ],
    };

    return conditionQuestions[category] || [];
  };

  // Helper function to get recommended repairs/changes questions
  const getRecommendedRepairsQuestions = (category: string, subcategory?: string): JobQuestion[] => {
    const repairsQuestions: Record<string, JobQuestion[]> = {
      Decks: [
        // Decking Refinishing Recommendations
        { id: "recommended_decking", question: "Decking refinishing recommendations", type: "checkbox-multiple", options: ["Color change", "Power sanding", "Light sanding", "Pressure washing", "Fastener securing"], category: "Refinishing - Decking", section: "recommended", allowOther: true },
        { id: "recommended_decking_notes", question: "Decking notes and details", type: "textarea", category: "Refinishing - Decking", section: "recommended", dependency: "recommended_decking", dependencyValue: true },

        // Railing Refinishing Recommendations
        { id: "recommended_railing_top_cap", question: "Top cap only", type: "checkbox-multiple", options: ["Power sanding", "Light sanding"], category: "Refinishing - Railing", section: "recommended", allowOther: true },
        { id: "recommended_railing_top_cap_notes", question: "Top cap notes and details", type: "textarea", category: "Refinishing - Railing", section: "recommended", dependency: "recommended_railing_top_cap", dependencyValue: true },
        { id: "recommended_railing_complete", question: "Complete railing", type: "checkbox-multiple", options: ["Power sanding", "Light sanding"], category: "Refinishing - Railing", section: "recommended", allowOther: true },
        { id: "recommended_railing_complete_notes", question: "Complete railing notes and details", type: "textarea", category: "Refinishing - Railing", section: "recommended", dependency: "recommended_railing_complete", dependencyValue: true },
        { id: "recommended_railing_disassembly", question: "Railing disassembly needed?", type: "checkbox", category: "Refinishing - Railing", section: "recommended" },

        // Stairs Refinishing Recommendations
        { id: "recommended_stairs", question: "Stairs refinishing recommendations", type: "checkbox-multiple", options: ["Color change", "Power sanding", "Light sanding", "Pressure washing", "Fastener securing"], category: "Refinishing - Stairs", section: "recommended", allowOther: true },
        { id: "recommended_stairs_notes", question: "Stairs notes and details", type: "textarea", category: "Refinishing - Stairs", section: "recommended", dependency: "recommended_stairs", dependencyValue: true },

        // Verticals Refinishing Recommendations
        { id: "recommended_verticals", question: "Verticals refinishing recommendations", type: "checkbox-multiple", options: ["Color change", "Power sanding", "Light sanding", "Pressure washing", "Fastener securing"], category: "Refinishing - Miscellaneous", section: "recommended", allowOther: true },
        { id: "recommended_verticals_notes", question: "Verticals notes and details", type: "textarea", category: "Refinishing - Miscellaneous", section: "recommended", dependency: "recommended_verticals", dependencyValue: true },

        // Extras Refinishing Recommendations
        { id: "recommended_extras", question: "Extras refinishing recommendations", type: "checkbox-multiple", options: ["Color change", "Power sanding", "Light sanding", "Pressure washing", "Fastener securing"], category: "Refinishing - Extras", section: "recommended", allowOther: true },
        { id: "recommended_extras_notes", question: "Extras notes and details", type: "textarea", category: "Refinishing - Extras", section: "recommended", dependency: "recommended_extras", dependencyValue: true },
      ],
      Pergolas: [
        { id: "recommended_pergola_material", question: "Recommended pergola material", type: "select-with-other", options: ["Cedar", "Composite", "Aluminum", "Steel", "Pressure Treated Pine", "Keep existing"], category: "Recommended Materials", section: "recommended", allowOther: true },
        { id: "recommended_cover_addition", question: "Recommended cover/roofing", type: "select-with-other", options: ["Add polycarbonate panels", "Install fabric canopy", "Add metal roofing", "Install retractable cover", "Keep open design"], category: "Recommended Design", section: "recommended", allowOther: true },
        { id: "recommended_pergola_notes", question: "Detailed pergola recommendations", type: "textarea", category: "Recommended Notes", section: "recommended" },
      ],
      Hardscaping: [
        { id: "recommended_hardscape_material", question: "Recommended hardscape material", type: "select-with-other", options: ["Concrete pavers", "Natural stone", "Brick pavers", "Flagstone", "Stamped concrete", "Keep existing"], category: "Recommended Materials", section: "recommended", allowOther: true },
        { id: "recommended_drainage_improvements", question: "Drainage improvements needed", type: "checkbox-multiple", options: ["Add drainage system", "Improve slope/grading", "Install permeable pavers", "Add French drain", "Repair existing drainage", "No improvements needed"], category: "Recommended Systems", section: "recommended", allowOther: true },
        { id: "recommended_edge_treatment", question: "Edge restraint recommendation", type: "select-with-other", options: ["Install/repair plastic edging", "Add concrete edge restraint", "Install steel edging", "Use natural stone border", "No edge treatment needed"], category: "Recommended Details", section: "recommended", allowOther: true },
        { id: "recommended_hardscape_notes", question: "Detailed hardscaping recommendations", type: "textarea", category: "Recommended Notes", section: "recommended" },
      ],
      "Retaining Walls": [
        { id: "recommended_wall_material", question: "Recommended wall material", type: "select-with-other", options: ["Segmental retaining wall blocks", "Natural stone", "Concrete block", "Poured concrete", "Timber", "Keep existing"], category: "Recommended Materials", section: "recommended", allowOther: true },
        { id: "recommended_drainage_system", question: "Drainage system recommendation", type: "select-with-other", options: ["Install French drain", "Add weep holes", "Improve gravel backfill", "Install drain tile", "Upgrade existing system"], category: "Recommended Systems", section: "recommended", allowOther: true },
        { id: "recommended_wall_notes", question: "Detailed retaining wall recommendations", type: "textarea", category: "Recommended Notes", section: "recommended" },
      ],
      Roofs: [
        { id: "recommended_roof_material", question: "Recommended roofing material", type: "select-with-other", options: ["Asphalt shingles (architectural)", "Metal roofing", "Tile", "Slate", "TPO/EPDM", "Keep existing"], category: "Recommended Materials", section: "recommended", allowOther: true },
        { id: "recommended_roof_timing", question: "Recommended replacement timing", type: "select-with-other", options: ["Immediate replacement", "Within 1 year", "Within 2-3 years", "Monitor condition", "No replacement needed"], category: "Recommended Timeline", section: "recommended", allowOther: true },
        { id: "recommended_ventilation", question: "Ventilation improvements", type: "checkbox-multiple", options: ["Add ridge vents", "Add soffit vents", "Improve attic ventilation", "Add exhaust fans", "No improvement needed"], category: "Recommended Systems", section: "recommended", allowOther: true },
        { id: "recommended_roof_notes", question: "Detailed roofing recommendations", type: "textarea", category: "Recommended Notes", section: "recommended" },
      ],
      Painting: [
        { id: "recommended_paint_type", question: "Recommended paint/stain type", type: "select-with-other", options: ["Wood Iron Premium", "Wood Iron Semi-Solid", "Premium latex paint", "Oil-based paint", "Solid stain", "Semi-transparent stain", "Primer + paint system"], category: "Recommended Materials", section: "recommended", allowOther: true },
        { id: "recommended_prep_level", question: "Recommended prep level", type: "select-with-other", options: ["Light prep (wash & prime)", "Standard prep (scrape, sand, prime)", "Heavy prep (extensive repair)", "Complete strip to bare wood"], category: "Recommended Process", section: "recommended", allowOther: true },
        { id: "recommended_paint_timeline", question: "Recommended painting timeline", type: "select-with-other", options: ["Immediate (protection needed)", "Within 6 months", "Next season", "Future planning"], category: "Recommended Timeline", section: "recommended", allowOther: true },
        { id: "recommended_paint_notes", question: "Detailed painting recommendations", type: "textarea", category: "Recommended Notes", section: "recommended" },
      ],
    };

    return repairsQuestions[category] || [];
  };

  // Helper function to get Replace Existing / Addition specific questions
  const getReplaceAdditionQuestions = (category: string): JobQuestion[] => {
    const replaceAdditionQuestions: Record<string, JobQuestion[]> = {
      Decks: [
        // ===== CURRENT STRUCTURE ASSESSMENT =====
        { id: "ra_current_structure_type", question: "What type of structure is being replaced/added to?", type: "select-with-other", options: ["Full deck", "Deck section", "Stairs only", "Railing only", "Frame only", "Decking only"], category: "Current Structure - Type", section: "current", required: true, allowOther: true, perStructure: true },

        // Current Measurements
        { id: "ra_current_deck_dimensions", question: "Current deck dimensions", type: "multiple-dimensions", category: "Current Structure - Measurements", section: "current", perStructure: true },
        { id: "ra_current_deck_height", question: "Current deck height from ground", type: "text", category: "Current Structure - Measurements", section: "current", perStructure: true },
        { id: "ra_current_railing_linear_ft", question: "Current railing linear feet", type: "number", unit: "linear ft", category: "Current Structure - Measurements", section: "current", perStructure: true },
        { id: "ra_current_stair_count", question: "Current number of stairs", type: "number", category: "Current Structure - Measurements", section: "current", perStructure: true },

        // Current Materials & Condition
        { id: "ra_current_decking_material", question: "Current decking material", type: "select-with-other", options: ["Pressure Treated Pine", "Cedar", "Redwood", "Composite", "PVC", "Unknown"], category: "Current Structure - Materials", section: "current", allowOther: true, perStructure: true },
        { id: "ra_current_frame_material", question: "Current frame material", type: "select-with-other", options: ["Pressure Treated Pine", "Douglas Fir", "LVL", "Steel", "Unknown"], category: "Current Structure - Materials", section: "current", allowOther: true, perStructure: true },
        { id: "ra_current_railing_material", question: "Current railing material", type: "select-with-other", options: ["Wood", "Composite", "Aluminum", "Cable", "Iron", "None", "Unknown"], category: "Current Structure - Materials", section: "current", allowOther: true, perStructure: true },
        { id: "ra_current_condition_notes", question: "Current condition notes and issues", type: "textarea", category: "Current Structure - Condition", section: "current", placeholder: "Describe current condition, damage, wear, structural issues...", perStructure: true },

        // ===== RECOMMENDED REPLACEMENT/ADDITION =====
        { id: "ra_work_type", question: "Type of work needed", type: "checkbox-multiple", options: ["Full replacement", "Partial replacement", "Addition/expansion", "Structural repair"], category: "Recommended Work - Type", section: "recommended", required: true, allowOther: true, perStructure: true },

        // Recommended Dimensions
        { id: "ra_recommended_dimensions", question: "Recommended/new dimensions", type: "select-with-other", options: ["Same as existing", "Custom dimensions (specify below)"], category: "Recommended Work - Dimensions", section: "recommended", allowOther: true, perStructure: true },
        { id: "ra_new_deck_dimensions", question: "New deck dimensions (if different)", type: "multiple-dimensions", category: "Recommended Work - Dimensions", section: "recommended", dependency: "ra_recommended_dimensions", dependencyValue: "Custom dimensions (specify below)", perStructure: true },
        { id: "ra_addition_dimensions", question: "Addition dimensions (if expanding)", type: "multiple-dimensions", category: "Recommended Work - Dimensions", section: "recommended", perStructure: true },

        // Recommended Materials
        { id: "ra_recommended_decking", question: "Recommended decking material", type: "select-with-other", options: ["Same as existing", "Pressure Treated Pine", "Cedar", "Redwood", "Composite (Deckorators)", "Composite (Trex)", "PVC"], category: "Recommended Work - Materials", section: "recommended", allowOther: true, perStructure: true },
        { id: "ra_recommended_frame", question: "Recommended frame material", type: "select-with-other", options: ["Same as existing", "Pressure Treated Pine", "Douglas Fir", "LVL", "Steel"], category: "Recommended Work - Materials", section: "recommended", allowOther: true, perStructure: true },
        { id: "ra_recommended_railing", question: "Recommended railing material", type: "select-with-other", options: ["Same as existing", "Wood", "Composite", "Aluminum", "Cable", "Iron", "None needed"], category: "Recommended Work - Materials", section: "recommended", allowOther: true, perStructure: true },
        { id: "ra_recommended_railing_style", question: "Recommended railing style", type: "select-with-other", options: ["Same as existing", "Vertical balusters", "Horizontal balusters", "Cable railing", "Glass panels", "Privacy panels"], category: "Recommended Work - Materials", section: "recommended", allowOther: true, perStructure: true },

        // Description of Work
        { id: "ra_work_description", question: "Detailed description of recommended work", type: "textarea", category: "Recommended Work - Description", section: "recommended", placeholder: "Describe the recommended replacement or addition work in detail...", perStructure: true },
        { id: "ra_special_considerations", question: "Special considerations or notes", type: "textarea", category: "Recommended Work - Notes", section: "recommended", placeholder: "Any special requirements, access issues, permits needed, etc.", perStructure: true },
      ],
      Pergolas: [
        { id: "ra_current_pergola_dimensions", question: "Current pergola dimensions", type: "dimensions", category: "Current Structure - Measurements", section: "current", perStructure: true },
        { id: "ra_current_pergola_material", question: "Current pergola material", type: "select-with-other", options: ["Wood", "Aluminum", "Vinyl", "Steel", "Unknown"], category: "Current Structure - Materials", section: "current", allowOther: true, perStructure: true },
        { id: "ra_current_condition_notes", question: "Current condition notes", type: "textarea", category: "Current Structure - Condition", section: "current", perStructure: true },
        { id: "ra_work_type", question: "Type of work needed", type: "checkbox-multiple", options: ["Full replacement", "Partial replacement", "Addition/expansion", "Structural repair"], category: "Recommended Work - Type", section: "recommended", allowOther: true, perStructure: true },
        { id: "ra_recommended_dimensions", question: "Recommended dimensions", type: "select-with-other", options: ["Same as existing", "Custom dimensions"], category: "Recommended Work - Dimensions", section: "recommended", allowOther: true, perStructure: true },
        { id: "ra_recommended_material", question: "Recommended material", type: "select-with-other", options: ["Same as existing", "Cedar", "Aluminum", "Vinyl", "Steel", "Composite"], category: "Recommended Work - Materials", section: "recommended", allowOther: true, perStructure: true },
        { id: "ra_work_description", question: "Detailed work description", type: "textarea", category: "Recommended Work - Description", section: "recommended", perStructure: true },
      ],
      Hardscaping: [
        { id: "ra_current_area", question: "Current hardscape area", type: "squarefeet", category: "Current Structure - Measurements", section: "current", perStructure: true },
        { id: "ra_current_material", question: "Current hardscape material", type: "select-with-other", options: ["Concrete pavers", "Brick pavers", "Natural stone", "Concrete", "Gravel", "Unknown"], category: "Current Structure - Materials", section: "current", allowOther: true, perStructure: true },
        { id: "ra_current_condition_notes", question: "Current condition notes", type: "textarea", category: "Current Structure - Condition", section: "current", perStructure: true },
        { id: "ra_work_type", question: "Type of work needed", type: "checkbox-multiple", options: ["Full replacement", "Partial replacement", "Addition/expansion", "Repair"], category: "Recommended Work - Type", section: "recommended", allowOther: true, perStructure: true },
        { id: "ra_recommended_area", question: "Recommended area", type: "select-with-other", options: ["Same as existing", "Custom area"], category: "Recommended Work - Dimensions", section: "recommended", allowOther: true, perStructure: true },
        { id: "ra_recommended_material", question: "Recommended material", type: "select-with-other", options: ["Same as existing", "Concrete pavers", "Brick pavers", "Natural stone", "Stamped concrete"], category: "Recommended Work - Materials", section: "recommended", allowOther: true, perStructure: true },
        { id: "ra_work_description", question: "Detailed work description", type: "textarea", category: "Recommended Work - Description", section: "recommended", perStructure: true },
      ],
      "Retaining Walls": [
        { id: "ra_current_height", question: "Current wall height", type: "text", category: "Current Structure - Measurements", section: "current", perStructure: true },
        { id: "ra_current_length", question: "Current wall length", type: "number", unit: "ft", category: "Current Structure - Measurements", section: "current", perStructure: true },
        { id: "ra_current_material", question: "Current wall material", type: "select-with-other", options: ["Concrete block", "Natural stone", "Timber", "Poured concrete", "Unknown"], category: "Current Structure - Materials", section: "current", allowOther: true, perStructure: true },
        { id: "ra_current_condition_notes", question: "Current condition notes", type: "textarea", category: "Current Structure - Condition", section: "current", perStructure: true },
        { id: "ra_work_type", question: "Type of work needed", type: "checkbox-multiple", options: ["Full replacement", "Partial replacement", "Addition/extension", "Structural repair", "Reinforcement"], category: "Recommended Work - Type", section: "recommended", allowOther: true, perStructure: true },
        { id: "ra_recommended_dimensions", question: "Recommended dimensions", type: "select-with-other", options: ["Same as existing", "Custom dimensions"], category: "Recommended Work - Dimensions", section: "recommended", allowOther: true, perStructure: true },
        { id: "ra_recommended_material", question: "Recommended material", type: "select-with-other", options: ["Same as existing", "Concrete block", "Natural stone", "Segmental blocks", "Poured concrete"], category: "Recommended Work - Materials", section: "recommended", allowOther: true, perStructure: true },
        { id: "ra_work_description", question: "Detailed work description", type: "textarea", category: "Recommended Work - Description", section: "recommended", perStructure: true },
      ],
      Roofs: [
        { id: "ra_current_area", question: "Current roof area", type: "squarefeet", category: "Current Structure - Measurements", section: "current", perStructure: true },
        { id: "ra_current_material", question: "Current roofing material", type: "select-with-other", options: ["Asphalt shingles", "Metal", "Tile", "Slate", "TPO/EPDM", "Unknown"], category: "Current Structure - Materials", section: "current", allowOther: true, perStructure: true },
        { id: "ra_current_condition_notes", question: "Current condition notes", type: "textarea", category: "Current Structure - Condition", section: "current", perStructure: true },
        { id: "ra_work_type", question: "Type of work needed", type: "checkbox-multiple", options: ["Full replacement", "Partial replacement", "Addition", "Repair"], category: "Recommended Work - Type", section: "recommended", allowOther: true, perStructure: true },
        { id: "ra_recommended_area", question: "Recommended area", type: "select-with-other", options: ["Same as existing", "Custom area"], category: "Recommended Work - Dimensions", section: "recommended", allowOther: true, perStructure: true },
        { id: "ra_recommended_material", question: "Recommended material", type: "select-with-other", options: ["Same as existing", "Asphalt shingles", "Metal", "Tile", "TPO/EPDM"], category: "Recommended Work - Materials", section: "recommended", allowOther: true, perStructure: true },
        { id: "ra_work_description", question: "Detailed work description", type: "textarea", category: "Recommended Work - Description", section: "recommended", perStructure: true },
      ],
    };
    return replaceAdditionQuestions[category] || [];
  };

  // Questions per type (ENHANCED WITH ALL NEW FEATURES)
  const getJobQuestions = (jobType: string): JobQuestion[] => {
    const category = jobType.split(" - ")[0];
    const subcategory = jobType.split(" - ")[1] || "";
    const isNewBuild = subcategory === "New Build";

    const questionsMap: Record<string, JobQuestion[]> = {
      Decks: [
        // ===== BASIC SETUP INFO =====
        { id: "number_of_structures", question: "How many structures are in this project?", type: "number", required: true, category: "Basic Measurements", min: 1, max: 10 },
        { id: "deck_sections", question: "Number of deck sections/levels", type: "number", required: true, category: "Basic Measurements", perStructure: true },
        { id: "main_deck_dimensions", question: "Deck area dimensions", type: "multiple-dimensions", required: true, category: "Basic Measurements", perStructure: true },
        { id: "ground_level_deck", question: "Is this a ground level deck?", type: "checkbox-multiple", options: ["Yes", "No"], required: true, category: "Basic Measurements", perStructure: true },
        { id: "deck_has_stairs", question: "Does this deck have stairs?", type: "checkbox-multiple", options: ["Yes", "No"], required: true, category: "Basic Measurements", perStructure: true },

        // (Frame & columns and decking questions come from newBuildQuestions for New Build)

        // ===== RAILING QUESTIONS =====
        { id: "does_deck_have_railings", question: "Does this deck have railings?", type: "checkbox-multiple", options: ["Yes", "No"], required: true, category: "Railing Assessment", perStructure: true },
        { id: "railing_material", question: "Railing material type", type: "select-with-other", options: ["Redwood", "Composite", "Aluminum", "Cable Railing", "Vertical Balluster", "Horizontal Balluster", "Privacy Panel or Wall", "Hog Wire", "Log", "Custom"], required: true, category: "Railings", dependency: "does_deck_have_railings", dependencyValue: true, allowOther: true, perStructure: true },
        { id: "railing_custom_description", question: "Custom railing description", type: "textarea", category: "Railings", dependency: "railing_material", dependencyValue: "Custom", perStructure: true },
        { id: "railing_powder_coating", question: "Powder coating for metal railing?", type: "checkbox-multiple", options: ["Yes", "No"], category: "Railings", dependency: "railing_material", dependencyValue: "Aluminum", perStructure: true },
        { id: "railing_powder_coating_color", question: "Powder coating color", type: "text", category: "Railings", dependency: "railing_powder_coating", dependencyValue: true, perStructure: true },
        { id: "stairs_have_railings", question: "Do the stairs have railings?", type: "checkbox-multiple", options: ["Yes", "No"], category: "Railing Assessment", dependency: "deck_has_stairs", dependencyValue: true, perStructure: true },
        { id: "stair_railing_sides", question: "Stair railing on one side or both sides?", type: "checkbox-multiple", options: ["One side", "Both sides"], category: "Railing Assessment", dependency: "stairs_have_railings", dependencyValue: true, perStructure: true },

        // ===== RAILING MEASUREMENTS =====
        { id: "total_level_railing_linear_ft", question: "Total level horizontal railing", type: "number", unit: "linear ft", category: "Railing Measurements", dependency: "does_deck_have_railings", dependencyValue: true, perStructure: true },
        { id: "total_stair_railing_linear_ft", question: "Total stair railing", type: "number", unit: "linear ft", category: "Railing Measurements", dependency: "stairs_have_railings", dependencyValue: true, perStructure: true },

        // ===== STAIRS =====
        { id: "calculated_number_of_steps", question: "Calculated number of steps", type: "calculation-display", category: "Stairs", calculation: "steps-from-railing", perStructure: true },
        { id: "stair_tread_material", question: "What material are the stair treads?", type: "select-with-other", options: ["Pressure Treated Pine", "Cedar", "Redwood", "Hardwood", "Composite", "Same as deck"], category: "Stairs", dependency: "deck_has_stairs", dependencyValue: true, allowOther: true, perStructure: true },
        { id: "stair_tread_boards", question: "Stair treads: one board or two?", type: "select", options: ["One board", "Two boards"], category: "Stairs", dependency: "deck_has_stairs", dependencyValue: true, perStructure: true },
        { id: "stairs_enclosed_or_open", question: "Are stairs enclosed or open?", type: "select", options: ["Enclosed", "Open"], category: "Stairs", dependency: "deck_has_stairs", dependencyValue: true, perStructure: true },
        { id: "stairs_have_risers", question: "Are there risers?", type: "checkbox-multiple", options: ["Yes", "No"], category: "Stairs", dependency: "deck_has_stairs", dependencyValue: true, perStructure: true },
        { id: "stair_stringer_material", question: "What material are the stringers?", type: "select-with-other", options: ["Pressure Treated Pine", "Cedar", "Steel", "Composite"], category: "Stairs", dependency: "deck_has_stairs", dependencyValue: true, allowOther: true, perStructure: true },
        { id: "number_of_stringers", question: "How many stringers?", type: "number", category: "Stairs", dependency: "deck_has_stairs", dependencyValue: true, perStructure: true },
        { id: "stairs_have_landing", question: "Do stairs have a middle landing?", type: "checkbox-multiple", options: ["Yes", "No"], category: "Stairs", dependency: "deck_has_stairs", dependencyValue: true, perStructure: true },
        { id: "landing_type", question: "Type of landing at bottom of stairs", type: "select-with-other", options: ["Concrete pad", "Pavers", "Gravel", "Grass", "Wood platform", "No landing"], category: "Stairs", dependency: "stairs_have_landing", dependencyValue: true, allowOther: true, perStructure: true },

        // ===== FASCIA =====
        { id: "fascia_size", question: "Fascia size", type: "select-with-other", options: ["12 inch", "10 inch", "8 inch", "6 inch"], category: "Fascia", allowOther: true, perStructure: true },
        { id: "fascia_color", question: "What color is the fascia?", type: "select-with-other", options: ["Match deck color", "White", "Black", "Brown", "Gray", "Natural wood", "Custom color"], category: "Fascia", allowOther: true, perStructure: true },
        { id: "fascia_linear_feet", question: "Fascia linear feet", type: "number", unit: "linear ft", category: "Fascia", perStructure: true },

        // (Staircase questions come from newBuildQuestions for New Build)

        // ===== MISCELLANEOUS =====
        { id: "miscellaneous_areas", question: "Miscellaneous items that need attention", type: "add-sections", category: "Miscellaneous", placeholder: "e.g., skirting, fascia, posts, beams, verticals, etc.", perStructure: true },

        // ===== DOCUMENTATION =====
        { id: "photo_video_reminder", question: "Photo/Video Documentation Reminder", type: "calculation-display", category: "Documentation - Pictures and Videos" },
        { id: "materials_list", question: "Generated Materials List", type: "material-list", category: "Materials & Pricing" },
      ],
      
      Pergolas: [
        { id: "number_of_structures", question: "How many structures are in this project?", type: "number", required: true, category: "Basic Measurements", min: 1, max: 10 },
        { id: "pergola_dimensions", question: "Pergola dimensions", type: "dimensions", required: true, category: "Basic Measurements" },
        { id: "pergola_height", question: "Pergola height", type: "select-with-other", options: ["8 feet", "9 feet", "10 feet", "11 feet", "12 feet", "Custom height"], required: true, category: "Basic Measurements", allowOther: true },
        { id: "pergola_material", question: "Preferred pergola material", type: "select-with-other", options: ["Cedar", "Pressure Treated Pine", "Composite", "Aluminum", "Steel"], required: true, category: "Materials", allowOther: true },
        { id: "roofing_cover", question: "Roofing/cover type", type: "select-with-other", options: ["Open (no cover)", "Polycarbonate panels", "Fabric canopy", "Metal roofing", "Retractable canopy"], category: "Cover Options", allowOther: true },
        { id: "foundation_type", question: "Foundation type", type: "select-with-other", options: ["Concrete footings", "Deck mounted", "Patio mounted", "Ground anchors"], category: "Foundation", allowOther: true },
        { id: "electrical_needs", question: "Electrical requirements", type: "checkbox-multiple", options: ["Lighting fixtures", "Ceiling fans", "Electrical outlets", "Speaker wiring", "None needed"], category: "Electrical", allowOther: true },
        { id: "materials_list", question: "Generated Pergola Materials List", type: "material-list", category: "Materials & Installation" },
      ],

      Hardscaping: [
        { id: "number_of_structures", question: "How many structures are in this project?", type: "number", required: true, category: "Basic Measurements", min: 1, max: 10 },
        { id: "hardscape_area", question: "Total hardscaping area", type: "squarefeet", required: true, category: "Basic Measurements" },
        { id: "hardscape_type", question: "Type of hardscaping", type: "select-with-other", options: ["Patio", "Walkway", "Driveway", "Pool deck", "Fire pit area", "Outdoor kitchen area"], required: true, category: "Project Type", allowOther: true },
        { id: "hardscape_material", question: "Preferred material", type: "select-with-other", options: ["Concrete pavers", "Natural stone", "Brick pavers", "Flagstone", "Stamped concrete", "Plain concrete"], required: true, category: "Materials", allowOther: true },
        { id: "pattern_style", question: "Pattern/style preference", type: "select-with-other", options: ["Running bond", "Herringbone", "Basket weave", "Random pattern", "Soldier course border", "Custom design"], category: "Design", allowOther: true },
        { id: "drainage_requirements", question: "Drainage considerations", type: "checkbox-multiple", options: ["Slopes away from house", "French drain needed", "Permeable pavers", "Existing drainage adequate", "Special drainage requirements"], category: "Drainage", allowOther: true },
        { id: "edge_treatment", question: "Edge restraint type", type: "select-with-other", options: ["Plastic edging", "Concrete edge restraint", "Steel edging", "Natural stone border", "No edge treatment"], category: "Details", allowOther: true },
        { id: "materials_list", question: "Generated Hardscaping Materials List", type: "material-list", category: "Materials & Installation" },
      ],

      "Retaining Walls": [
        { id: "number_of_structures", question: "How many structures are in this project?", type: "number", required: true, category: "Basic Measurements", min: 1, max: 10 },
        { id: "wall_height", question: "Maximum wall height", type: "select-with-other", options: ["1-2 feet", "2-3 feet", "3-4 feet", "4-5 feet", "5-6 feet", "Over 6 feet"], required: true, category: "Basic Measurements", allowOther: true },
        { id: "wall_length", question: "Total wall length", type: "number", unit: "ft", required: true, category: "Basic Measurements" },
        { id: "wall_configuration", question: "Is the retaining wall straight or does it have any bends or wings or changes in height?", type: "checkbox-multiple", options: ["Straight wall", "Has bends/curves", "Has wings or returns", "Has height changes", "Multiple sections"], category: "Wall Configuration", allowOther: true },
        { id: "wall_material", question: "Preferred wall material", type: "select-with-other", options: ["Segmental retaining wall blocks", "Natural stone", "Concrete block", "Poured concrete", "Timber/Railroad ties", "Boulder/Rock"], required: true, category: "Materials", allowOther: true },
        { id: "soil_conditions", question: "Soil conditions behind wall", type: "select-with-other", options: ["Clay soil", "Sandy soil", "Rocky soil", "Mixed soil", "Unknown"], category: "Site Conditions", allowOther: true },
        { id: "drainage_needs", question: "Drainage requirements", type: "checkbox-multiple", options: ["French drain behind wall", "Weep holes", "Gravel backfill", "No special drainage"], category: "Drainage", allowOther: true },
        { id: "materials_list", question: "Generated Retaining Wall Materials List", type: "material-list", category: "Materials & Planning" },
      ],

      Roofs: [
        { id: "number_of_structures", question: "How many structures are in this project?", type: "number", required: true, category: "Basic Measurements", min: 1, max: 10 },
        { id: "roof_area", question: "Total roof area", type: "squarefeet", required: true, category: "Basic Measurements" },
        { id: "roof_material", question: "Preferred roofing material", type: "select-with-other", options: ["Asphalt shingles (architectural)", "Metal roofing (steel)", "Metal roofing (aluminum)", "Tile (concrete)", "Tile (clay)", "Slate", "TPO/EPDM"], required: true, category: "Materials", allowOther: true },
        { id: "roof_pitch", question: "Roof pitch/slope", type: "select-with-other", options: ["Low slope (under 3/12)", "Standard slope (4/12 to 8/12)", "Steep slope (9/12 to 12/12)", "Very steep (over 12/12)"], category: "Roof Details", allowOther: true },
        { id: "roof_complexity", question: "Roof complexity", type: "select-with-other", options: ["Simple gable", "Hip roof", "Multiple gables", "Complex (multiple levels)", "Flat roof"], category: "Roof Details", allowOther: true },
        { id: "gutters_needed", question: "Gutter system needed", type: "checkbox-multiple", options: ["New gutters", "Gutter guards", "Downspout extensions", "Repair existing", "No gutters needed"], category: "Gutter System", allowOther: true },
        { id: "ventilation_needs", question: "Ventilation requirements", type: "checkbox-multiple", options: ["Ridge vents", "Soffit vents", "Exhaust fans", "Turbine vents", "Existing adequate"], category: "Ventilation", allowOther: true },
        { id: "insulation_upgrade", question: "Attic insulation upgrade", type: "checkbox", category: "Energy Efficiency" },
        { id: "materials_list", question: "Generated Roofing Materials List", type: "material-list", category: "Materials & Installation" },
      ],

      Painting: [
        { id: "number_of_areas", question: "How many areas are there that need to be painted?", type: "number", required: true, category: "Basic Measurements", min: 1, max: 20 },
        { id: "paint_area", question: "Total area to paint", type: "squarefeet", required: true, category: "Basic Measurements" },
        { id: "paint_location", question: "Paint location", type: "select-with-other", options: ["Interior only", "Exterior only", "Both interior and exterior"], required: true, category: "Project Scope", allowOther: true },
        { id: "surface_types", question: "Surface types to paint", type: "checkbox-multiple", options: ["Walls", "Ceilings", "Trim/Doors", "Cabinets", "Exterior siding", "Exterior trim", "Deck/Fence"], category: "Surfaces", allowOther: true },
        { id: "surface_condition", question: "Current surface condition", type: "select-with-other", options: ["Excellent - minimal prep", "Good - light prep needed", "Fair - moderate prep needed", "Poor - extensive prep needed", "Bare wood/new surface"], required: true, category: "Surface Preparation", allowOther: true },
        { id: "prep_work_needed", question: "Preparation work needed", type: "checkbox-multiple", options: ["Power washing", "Scraping loose paint", "Sanding", "Caulking/filling", "Priming", "Repair work"], category: "Surface Preparation", allowOther: true },
        { id: "paint_type", question: "Paint/finish type preference", type: "select-with-other", options: ["Wood Iron Premium Stain", "Wood Iron Semi-Solid Stain", "Premium latex paint", "Standard latex paint", "Oil-based paint", "Semi-transparent stain", "Solid color stain"], required: true, category: "Paint Selection", allowOther: true },
        { id: "color_consultation", question: "Color consultation needed", type: "checkbox", category: "Design Services" },
        { id: "materials_list", question: "Generated Painting Materials List", type: "material-list", category: "Materials & Labor" },
      ],

    };

    let questions = questionsMap[category as keyof typeof questionsMap] || [];

    // Enhanced deck questions with all new features
    if (category === "Decks") {
      questions = [...questions];
      if (subcategory === "New Build") {
        const newBuildQuestions: JobQuestion[] = [
          // ===== BASIC SETUP INFO =====
          {
            id: "foundation_type",
            question: "Foundation / Pier Type",
            type: "checkbox-multiple",
            options: ["Concrete footings (42\" deep CO)", "Helical piers (engineered)", "Pier footings", "Other"],
            required: false,
            category: "Foundation Planning",
            allowOther: true,
            perStructure: true,
          },

          // ===== DECK FRAME & COLUMNS =====
          {
            id: "framing_material",
            question: "Framing material",
            type: "select-with-other",
            options: ["KDPT #2", "Tru Joist #1", "LVL", "Steel"],
            required: true,
            category: "Framing Design",
            allowOther: true,
            perStructure: true,
          },
          {
            id: "joist_size",
            question: "Joist size preference",
            type: "select-with-other",
            options: ["2x8 (standard)", "2x10 (longer spans)", "2x12 (heavy duty)"],
            required: true,
            category: "Framing Design",
            allowOther: true,
            perStructure: true,
          },
          {
            id: "joist_direction",
            question: "Joist direction (for precise board count)",
            type: "select",
            options: ["Parallel to house", "Perpendicular to house", "45-degree angle"],
            required: true,
            category: "Framing Design",
            perStructure: true,
          },
          {
            id: "header_length",
            question: "Ledger length",
            type: "number",
            unit: "ft",
            required: true,
            category: "Framing Design",
            perStructure: true,
          },
          {
            id: "joist_spacing",
            question: "Joist spacing",
            type: "select",
            options: ['12" OC', '16" OC', '24" OC'],
            required: true,
            category: "Framing Design",
            perStructure: true,
          },
          // BEAM CONFIGURATION SECTION
          {
            id: "beam_size",
            question: "Beam type preference",
            type: "select-with-other",
            options: [
              "Double 2x10",
              "Double 2x12",
              "LVL 1.75x9.25",
              "LVL 1.75x11.25",
              "LVL 1.75x14",
              "LVL 1.75x16",
              "Alaskan Yellow Cedar 5x9",
              "Alaskan Yellow Cedar 5x12",
              "Alaskan Yellow Cedar 6x9",
              "Alaskan Yellow Cedar 6x12",
              "Steel Beam W8x10",
              "Steel Beam W10x12"
            ],
            required: true,
            category: "Beam Configuration",
            allowOther: true,
            perStructure: true,
          },
          {
            id: "beam_type",
            question: "Beam mounting type",
            type: "radio",
            options: ["Raised beam", "Dropped beam"],
            required: true,
            category: "Beam Configuration",
            perStructure: true,
          },
          {
            id: "beam_linear_feet",
            question: "Total beam linear feet",
            type: "number",
            unit: "ft",
            required: true,
            category: "Beam Configuration",
            perStructure: true,
          },
          {
            id: "additional_beam_needed",
            question: "Additional beam needed?",
            type: "checkbox",
            category: "Beam Configuration",
            perStructure: true,
          },
          {
            id: "second_beam_linear_feet",
            question: "Second beam linear feet",
            type: "number",
            unit: "ft",
            category: "Beam Configuration",
            dependency: "additional_beam_needed",
            dependencyValue: true,
            perStructure: true,
          },
          {
            id: "joist_connection_type",
            question: "Joist connection to beam",
            type: "select-with-other",
            options: ["Joist hangers on beam", "Joists sit on top", "Flush beam", "Double beam with joists between"],
            category: "Beam Configuration",
            allowOther: true,
            perStructure: true,
          },
          {
            id: "joist_hanger_type",
            question: "Joist hanger type",
            type: "select",
            options: ["Single joist hangers", "Double joist hangers", "Mix of single and double"],
            category: "Beam Configuration",
            dependency: "joist_connection_type",
            dependencyValue: "Joist hangers on beam",
            perStructure: true,
          },
          {
            id: "blocking_needed",
            question: "Blocking needed between joists?",
            type: "checkbox",
            category: "Framing Details",
            perStructure: true,
          },
          {
            id: "blocking_spacing",
            question: "Blocking spacing",
            type: "select",
            options: ["Mid-span (one row)", "Every 4 feet", "Every 6 feet", "Every 8 feet"],
            category: "Framing Details",
            dependency: "blocking_needed",
            dependencyValue: true,
            perStructure: true,
          },
          {
            id: "blocking_material",
            question: "Blocking material",
            type: "select-with-other",
            options: ["Same as joist size", "2x6", "2x8", "2x10"],
            category: "Framing Details",
            dependency: "blocking_needed",
            dependencyValue: true,
            allowOther: true,
            perStructure: true,
          },
          // COLUMN SECTION WITH INDIVIDUAL LENGTHS
          {
            id: "total_columns_needed",
            question: "Total number of columns needed",
            type: "number",
            required: true,
            category: "Column Planning",
            perStructure: true,
          },
          {
            id: "column_height",
            question: "Column height",
            type: "select-with-other",
            options: ["8 feet", "9 feet", "10 feet", "11 feet", "12 feet", "Custom height"],
            required: true,
            category: "Column Planning",
            allowOther: true,
            perStructure: true,
          },
          {
            id: "column_size",
            question: "Column size",
            type: "select-with-other",
            options: ["4x4", "4x6", "6x6", "8x8", "10x10", "12x12"],
            required: true,
            category: "Column Planning",
            allowOther: true,
            perStructure: true,
          },
          {
            id: "column_material",
            question: "Column material",
            type: "select-with-other",
            options: ["Douglas Fir (Rough)", "Douglas Fir (Smooth)", "Cedar (Rough)", "Cedar (Smooth)", "Steel"],
            required: true,
            category: "Column Planning",
            allowOther: true,
            perStructure: true,
          },
          // SWAY BRACES
          {
            id: "sway_braces_needed",
            question: "Sway braces needed",
            type: "checkbox",
            category: "Deck Support",
            perStructure: true,
          },
          {
            id: "sway_brace_size",
            question: "Sway brace total linear feet",
            type: "number",
            unit: "linear ft",
            category: "Deck Support",
            dependency: "sway_braces_needed",
            dependencyValue: true,
            perStructure: true,
          },
          {
            id: "sway_brace_material",
            question: "Sway brace material",
            type: "select-with-other",
            options: ["4x4", "4x6", "6x6", "8x8", "10x10", "12x12", "2x8 PT", "2x10 PT", "Steel cable", "Metal brackets"],
            category: "Deck Support",
            dependency: "sway_braces_needed",
            dependencyValue: true,
            allowOther: true,
            perStructure: true,
          },
          {
            id: "sway_brace_quantity",
            question: "Number of sway braces",
            type: "number",
            category: "Deck Support",
            dependency: "sway_braces_needed",
            dependencyValue: true,
            perStructure: true,
          },
          // JOIST TAPE SYSTEM
          {
            id: "joist_tape_needed",
            question: "Joist tape system",
            type: "checkbox",
            category: "Protection Systems",
            perStructure: true,
          },
          {
            id: "joist_tape_size",
            question: "Joist tape size",
            type: "select",
            options: ["2\"", "4\"", "6\"", "9\"", "12\""],
            category: "Protection Systems",
            dependency: "joist_tape_needed",
            dependencyValue: true,
            perStructure: true,
          },

          // ===== DECKING QUESTIONS =====
          {
            id: "decking_material",
            question: "Decking material preference",
            type: "select-with-other",
            options: [
              "Deckorators Voyage (Surestone Technology)",
              "Deckorators Vault (Mineral-Based)",
              "Deckorators Vista (Tropical Look)",
              "Deckorators Trailhead (Cost-Effective)",
              "Redwood",
              "Cedar",
              "Composite (Other Brand)",
              "Stone/Tile Deck Surface",
              "Porcelain Tile"
            ],
            category: "Decking Material",
            allowOther: true,
            perStructure: true,
          },
          {
            id: "picture_frame_border",
            question: "Picture frame border",
            type: "select-with-other",
            options: ["No picture frame", "Single board", "Double board", "Triple board"],
            category: "Decking Design",
            allowOther: true,
            perStructure: true,
          },
          {
            id: "multi_board_width",
            question: "Multi board width design",
            type: "checkbox",
            category: "Decking Design",
            perStructure: true,
          },

          // ===== RAILING QUESTIONS =====
          {
            id: "railing_height",
            question: "Railing height",
            type: "select-with-other",
            options: ["36 inches (standard)", "42 inches (high deck)"],
            category: "Railing Design",
            dependency: "railing_needed",
            dependencyValue: true,
            allowOther: true,
            perStructure: true,
          },
          {
            id: "railing_attachment_method",
            question: "Railing attachment method",
            type: "select-with-other",
            options: ["Surface mount", "Side mount"],
            category: "Railing Design",
            dependency: "railing_needed",
            dependencyValue: true,
            allowOther: true,
            perStructure: true,
          },

          // ===== STAIRCASE QUESTIONS =====
          {
            id: "stairs_needed",
            question: "Stairs needed",
            type: "checkbox-multiple",
            options: ["Yes", "No"],
            category: "Staircase",
            perStructure: true,
          },
          {
            id: "stair_calculation",
            question: "Automatic Stair Calculation",
            type: "calculation-display",
            category: "Staircase",
            dependency: "stairs_needed",
            dependencyValue: true,
            perStructure: true,
          },
          {
            id: "number_of_steps",
            question: "Number of steps needed (calculated automatically)",
            type: "number",
            category: "Staircase",
            dependency: "stairs_needed",
            dependencyValue: true,
            required: true,
            perStructure: true,
          },
          {
            id: "stair_design",
            question: "Staircase design",
            type: "select-with-other",
            options: ["Straight staircase", "L-shaped (90-degree turn)", "U-shaped (180-degree turn)", "Spiral staircase"],
            category: "Staircase",
            dependency: "stairs_needed",
            dependencyValue: true,
            required: true,
            allowOther: true,
            perStructure: true,
          },
          {
            id: "landings_needed",
            question: "Additional landings needed? (Note: Bottom landing is automatically included)",
            type: "checkbox-multiple",
            options: ["Yes", "No"],
            category: "Staircase",
            dependency: "stairs_needed",
            dependencyValue: true,
            perStructure: true,
          },
          {
            id: "number_of_landings",
            question: "Number of landings",
            type: "number",
            category: "Staircase",
            dependency: "landings_needed",
            dependencyValue: true,
            required: true,
            perStructure: true,
          },
          {
            id: "landing_dimensions",
            question: "Landing dimensions",
            type: "multiple-dimensions",
            category: "Staircase",
            dependency: "landings_needed",
            dependencyValue: true,
            perStructure: true,
          },
          {
            id: "number_of_stringers",
            question: "Number of stringers needed",
            type: "select",
            options: ["2 stringers", "3 stringers", "4 stringers", "5 stringers"],
            category: "Staircase",
            dependency: "stairs_needed",
            dependencyValue: true,
            required: true,
            perStructure: true,
          },
          {
            id: "stair_enclosure",
            question: "Staircase type",
            type: "select",
            options: ["Open", "Closed"],
            category: "Staircase",
            dependency: "stairs_needed",
            dependencyValue: true,
            required: true,
            perStructure: true,
          },
          {
            id: "stringer_material",
            question: "Stringer material",
            type: "select-with-other",
            options: ["2x12 pressure treated", "Rough sawn 3x12", "LVL stringer", "Steel stringers", "Composite stringers"],
            category: "Staircase",
            dependency: "stairs_needed",
            dependencyValue: true,
            required: true,
            allowOther: true,
            perStructure: true,
          },
          {
            id: "stair_braces_needed",
            question: "Stair braces/supports needed",
            type: "checkbox-multiple",
            options: ["Yes", "No"],
            category: "Staircase",
            dependency: "stairs_needed",
            dependencyValue: true,
            perStructure: true,
          },
          {
            id: "landing_material",
            question: "Landing material",
            type: "select-with-other",
            options: ["Concrete pad", "Paver stones", "Gravel", "Same as deck material"],
            category: "Staircase",
            dependency: "stairs_needed",
            dependencyValue: true,
            allowOther: true,
            perStructure: true,
          },
        ];
        // Insert newBuildQuestions after basic setup questions (position 5)
        questions.splice(5, 0, ...newBuildQuestions);
      } else if (subcategory === "Repair") {
        const repairQuestions: JobQuestion[] = [
          {
            id: "existing_material",
            question: "What is the deck currently made of?",
            type: "select-with-other",
            options: ["Pressure Treated Pine", "Cedar", "Composite (Trex/Deckorators)", "PVC", "Redwood", "Unknown/Mixed"],
            required: true,
            category: "Current Materials",
            allowOther: true,
          },
          {
            id: "existing_condition",
            question: "Overall deck condition",
            type: "select-with-other",
            options: ["Good - minor repairs", "Fair - moderate repairs", "Poor - major repairs"],
            required: true,
            category: "Assessment",
            allowOther: true,
          },
          {
            id: "problem_areas",
            question: "Problems observed",
            type: "checkbox-multiple",
            options: ["Loose boards", "Rotted boards", "Loose railings", "Structural sagging", "Foundation issues", "Staining/discoloration", "Splintering", "Fastener issues"],
            category: "Problems Found",
            allowOther: true,
          },
          {
            id: "repair_material_match",
            question: "Repair with matching materials?",
            type: "select-with-other",
            options: ["Yes - match existing", "No - upgrade materials", "Partial - mix of both"],
            category: "Repair Approach",
            allowOther: true,
          },
        ];
        questions.splice(-1, 0, ...repairQuestions);
      }
    }

    // Add enhanced questions for subcategories
    if (category === "Pergolas") {
      if (subcategory === "New Build") {
        questions.splice(-1, 0, {
          id: "soil_conditions",
          question: "Soil conditions for foundation installation",
          type: "select-with-other",
          options: ["Normal soil", "Rocky/hard soil", "Clay soil", "Sandy soil", "Wet/marshy"],
          category: "Site Conditions",
          allowOther: true,
        });
      }
    }

    if (category === "Hardscaping") {
      if (subcategory === "New Build") {
        questions.splice(-1, 0, {
          id: "existing_surface",
          question: "Current surface condition",
          type: "select-with-other",
          options: ["Grass/dirt", "Existing concrete", "Existing pavers", "Gravel", "Other hardscape"],
          category: "Site Assessment",
          allowOther: true,
        });
      }
    }


    // For Replace Existing / Addition, use the specialized questions instead of refinishing
    const isReplaceAddition = subcategory === "Replace Existing / Addition";

    if (isReplaceAddition) {
      // Add Replace/Addition specific questions (includes current conditions & recommended work)
      questions = [...questions, ...getReplaceAdditionQuestions(category)];
    } else if (!isNewBuild) {
      // Add current condition assessment questions for other non-new build job types
      questions = [...questions, ...getCurrentConditionQuestions(category)];
      // Add recommended repairs/changes questions (includes refinishing for Refinishing subcategory)
      questions = [...questions, ...getRecommendedRepairsQuestions(category)];
    }

    return questions;
  };

  // Validation with enhanced per-question checking
  const validateForm = (): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Basic form validation
    if (!jobData.estimatorName.trim()) {
      errors.push({ field: "estimatorName", message: "Estimator name is required" });
    }
    if (!jobData.customerName.trim()) {
      errors.push({ field: "customerName", message: "Customer name is required" });
    }
    if (jobData.jobTypes.length === 0) {
      errors.push({ field: "jobTypes", message: "At least one job type must be selected" });
    }
    if (jobData.gpsLat === 0 && jobData.gpsLng === 0) {
      errors.push({ field: "gpsLocation", message: "GPS location is required" });
    }

    // Job-specific validation
    jobData.jobTypes.forEach((jobType) => {
      const questions = getJobQuestions(jobType);
      questions.forEach((question) => {
        if (shouldShowQuestion(question, jobType) && question.required) {
          const value = jobData.jobSpecificAnswers[`${jobType}_${question.id}`];
          if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
            errors.push({ 
              field: `${jobType}_${question.id}`, 
              message: `${question.question} is required for ${jobType}` 
            });
          }
        }
      });
    });

    return errors;
  };

  // Enhanced calculation engine with precise decking
  const calculateMaterials = useMemo(() => {
    const calculations: Record<string, any> = {};

    jobData.jobTypes.forEach((jobType) => {
      if (jobType.includes("Decks") && jobType.includes("New Build")) {
        const dimensions = jobData.jobSpecificAnswers[`${jobType}_main_deck_dimensions`];
        const joistSize = jobData.jobSpecificAnswers[`${jobType}_joist_size`];
        const joistSpacing = jobData.jobSpecificAnswers[`${jobType}_joist_spacing`];
        const joistDirection = jobData.jobSpecificAnswers[`${jobType}_joist_direction`];
        // Use average deck length for calculations (replace dominant run length)
        const deckingType = jobData.jobSpecificAnswers[`${jobType}_decking_material`];
        const boardFaceLabel = jobData.jobSpecificAnswers[`${jobType}_board_face`] as string | undefined;
        const joistTapeNeeded = jobData.jobSpecificAnswers[`${jobType}_joist_tape_needed`];
        const swayBracesNeeded = jobData.jobSpecificAnswers[`${jobType}_sway_braces_needed`];
        const totalColumns = parseInt(jobData.jobSpecificAnswers[`${jobType}_total_columns_needed`] || "0");
        const beamLinearFeet = parseFloat(jobData.jobSpecificAnswers[`${jobType}_beam_linear_feet`] || "0");
        const secondBeamLinearFeet = parseFloat(jobData.jobSpecificAnswers[`${jobType}_second_beam_linear_feet`] || "0");
        const hasStairs = jobData.jobSpecificAnswers[`${jobType}_number_of_staircases`] > 0 || jobData.jobSpecificAnswers[`${jobType}_staircase_needed`];
        const joistHangerType = jobData.jobSpecificAnswers[`${jobType}_joist_hanger_type`];

        if (dimensions && Array.isArray(dimensions)) {
          const totalSqFt = dimensions.reduce((total: number, dim: any) => {
            return total + (parseFloat(dim.length || 0) * parseFloat(dim.width || 0));
          }, 0);

          let joistSpacingInches = 16;
          if (joistSpacing === '12" OC') joistSpacingInches = 12;
          if (joistSpacing === '24" OC') joistSpacingInches = 24;

          const avgWidth = dimensions.length > 0
            ? dimensions.reduce((sum: number, dim: any) => sum + parseFloat(dim.width || 0), 0) / dimensions.length
            : 0;

          const avgLength = dimensions.length > 0
            ? dimensions.reduce((sum: number, dim: any) => sum + parseFloat(dim.length || 0), 0) / dimensions.length
            : 0;

          const joistsNeeded = avgWidth > 0 ? Math.ceil((avgWidth * 12) / joistSpacingInches) + 1 : 0;
          // Calculate number of beams based on actual beam linear feet entered by user
          const totalBeamLinearFeet = beamLinearFeet + secondBeamLinearFeet;
          const beamsNeeded = totalBeamLinearFeet > 0 ? Math.ceil(totalBeamLinearFeet / avgWidth) : 1;

          // ENHANCED DECKING CALCULATION with precise measurements
          let deckingCalculation: {
            method: string;
            linearFeet: number;
            boardCount: number;
            waste: string;
            boardLength?: number;
            boardsPerRow?: number;
            effectiveCoverage?: number;
            joistDirection?: string;
          } = { method: "basic", linearFeet: 0, boardCount: 0, waste: "10%" };
          
          if (joistDirection && avgLength > 0 && boardFaceLabel) {
            // Precise calculation with joist direction
            const faceInches = DECK_BOARD_FACE_INCHES[boardFaceLabel] ?? 5.5;
            const boardCoverageFt = faceInches / 12;
            const kerfGapInches = 0.125; // 1/8" gap between boards
            const effectiveCoverage = (faceInches - kerfGapInches) / 12;
            
            let boardLength = avgLength;
            let boardsPerRow = Math.ceil(totalSqFt / avgLength / effectiveCoverage);
            
            // Adjust for joist direction
            if (joistDirection === "Perpendicular to house") {
              // Boards run across joists - use average length as board length
              boardLength = avgLength;
            } else if (joistDirection === "Parallel to house") {
              // Boards run with joists - need different calculation
              boardLength = avgWidth; // or longest dimension perpendicular to joists
              boardsPerRow = Math.ceil(avgLength / effectiveCoverage);
            }
            
            const totalBoards = boardsPerRow * Math.ceil(totalSqFt / (boardLength * effectiveCoverage * boardsPerRow));
            const wasteFactor = 1.10; // 10% waste
            const finalBoardCount = Math.ceil(totalBoards * wasteFactor);
            const totalLinearFeet = finalBoardCount * boardLength;
            
            deckingCalculation = {
              method: "precise",
              linearFeet: Math.round(totalLinearFeet),
              boardCount: finalBoardCount,
              boardLength: boardLength,
              boardsPerRow: boardsPerRow,
              effectiveCoverage: Math.round(effectiveCoverage * 12 * 100) / 100, // inches
              joistDirection: joistDirection,
              waste: "10%"
            };
          } else {
            // Fallback to basic calculation
            const faceInches = boardFaceLabel ? DECK_BOARD_FACE_INCHES[boardFaceLabel] ?? 5.5 : 5.5;
            const boardCoverageFt = faceInches / 12;
            const estimatedLinearFeet = boardCoverageFt > 0 ? Math.ceil(totalSqFt / boardCoverageFt * 1.1) : 0;
            deckingCalculation = { method: "basic", linearFeet: estimatedLinearFeet, boardCount: 0, waste: "10%" };
          }

          // Calculate joist tape if needed
          let joistTapeCalculation = null;
          if (joistTapeNeeded) {
            const allJoistsLinearFeet = joistsNeeded * avgLength;
            const rimJoistsLinearFeet = (avgWidth * 2) + (avgLength * 2); // Perimeter
            const beamCoverageLinearFeet = beamsNeeded * avgWidth;
            const totalJoistTape = Math.ceil(allJoistsLinearFeet + rimJoistsLinearFeet + beamCoverageLinearFeet);
            
            joistTapeCalculation = {
              totalLinearFeet: totalJoistTape,
              joistCoverage: allJoistsLinearFeet,
              rimJoistCoverage: rimJoistsLinearFeet,
              beamCoverage: beamCoverageLinearFeet,
              rolls: Math.ceil(totalJoistTape / 50), // Assume 50ft per roll
            };
          }

          calculations[`${jobType}_materials`] = {
            totalSquareFootage: Math.round(totalSqFt * 100) / 100,
            buildingCodes: {
              snowLoad: jobData.snowLoad || 30,
              liveLoad: jobData.liveLoad || 40,
              cityCode: jobData.cityCode || "Not specified",
            },
            joists: {
              size: joistSize || "2x8",
              quantity: joistsNeeded,
              length: avgWidth,
              spacing: joistSpacing || '16" OC',
              runLength: avgLength,
            },
            beams: {
              quantity: beamsNeeded,
              size: jobData.jobSpecificAnswers[`${jobType}_beam_size`] || "LVL 1.75x11.25",
              linearFeet: totalBeamLinearFeet,
              beamLinearFeet: beamLinearFeet,
              secondBeamLinearFeet: secondBeamLinearFeet,
            },
            columns: {
              quantity: totalColumns,
              height: jobData.jobSpecificAnswers[`${jobType}_column_height`] || "10 feet",
            },
            decking: {
              type: deckingType || "Pressure treated pine",
              ...deckingCalculation,
              assumedBoardFaceInches: boardFaceLabel ? DECK_BOARD_FACE_INCHES[boardFaceLabel] ?? 5.5 : 5.5,
            },
            joistTape: joistTapeCalculation,
            swayBraces: swayBracesNeeded ? {
              needed: true,
              material: jobData.jobSpecificAnswers[`${jobType}_sway_brace_material`] || "2x8 PT",
              quantity: parseInt(jobData.jobSpecificAnswers[`${jobType}_sway_brace_quantity`] || "0"),
            } : null,
            hardware: {
              deckScrews: Math.ceil(deckingCalculation.linearFeet * 2.2),
              singleJoistHangers: joistHangerType === "Single joist hangers" ? joistsNeeded * 2 : joistHangerType === "Mix of single and double" ? Math.ceil(joistsNeeded * 1.5) : 0,
              doubleJoistHangers: joistHangerType === "Double joist hangers" ? joistsNeeded * 2 : joistHangerType === "Mix of single and double" ? Math.ceil(joistsNeeded * 0.5) : 0,
              galvanizedBolts: beamsNeeded * 4,
              joistHangerNails: joistTapeNeeded ? 0 : (joistHangerType === "Double joist hangers" ? joistsNeeded * 16 : joistsNeeded * 8), // 16 nails for double hangers, 8 for single
              hiddenFasteners: deckingType?.toLowerCase().includes('composite') ? Math.ceil(deckingCalculation.linearFeet * 1.5) : 0, // Hidden fasteners for composite
            },
            concrete: {
              footings: totalColumns + (hasStairs ? 2 : 0), // Use actual column count + stair footings
              cubicYards: Math.ceil(((totalColumns + (hasStairs ? 2 : 0)) * 1.5) / 27 * 100) / 100,
            },
          };
        }
      }

      // Other material calculations for different job types
      if (jobType.includes("Patios")) {
        const totalArea = parseFloat(jobData.jobSpecificAnswers[`${jobType}_total_area`] || "0");
        const borderLF = parseFloat(jobData.jobSpecificAnswers[`${jobType}_border_linear_feet`] || "0");
        if (totalArea > 0) {
          const baseCourseYards = Math.ceil((totalArea * (6 / 12)) / 27 * 100) / 100;
          const sandYards = Math.ceil((totalArea * (1 / 12)) / 27 * 100) / 100;
          const paversNeeded = Math.ceil(totalArea * 1.05);
          calculations[`${jobType}_materials`] = {
            excavation: { squareFeet: totalArea, depth: 7, cubicYards: Math.ceil((totalArea * (7 / 12)) / 27 * 100) / 100 },
            baseCourse: { cubicYards: baseCourseYards, material: "AASHTO #57 stone" },
            sand: { cubicYards: sandYards, type: "Concrete sand" },
            pavers: { squareFeet: paversNeeded, waste: "5%", type: jobData.jobSpecificAnswers[`${jobType}_paver_type`] || "Concrete pavers" },
            edgeRestraint: { linearFeet: borderLF, type: "Plastic edge restraint" },
          };
        }
      }

      if (jobType.includes("Retaining Walls")) {
        const wallHeight = parseFloat(jobData.jobSpecificAnswers[`${jobType}_wall_height`] || "0");
        const wallLength = parseFloat(jobData.jobSpecificAnswers[`${jobType}_wall_length`] || "0");
        if (wallHeight > 0 && wallLength > 0) {
          const wallArea = wallHeight * wallLength;
          const heightCategory = wallHeight <= 2 ? "1-2 feet" : wallHeight <= 3 ? "2-3 feet" : wallHeight <= 4 ? "3-4 feet" : "4+ feet (professional design)";
          const blocksNeeded = Math.ceil(wallArea / 0.67); // Assume 8"x16" blocks
          const gravelYards = Math.ceil((wallLength * 1 * (wallHeight / 3)) / 27 * 100) / 100;
          const concreteYards = wallHeight > 3 ? Math.ceil((wallLength * 1 * 0.5) / 27 * 100) / 100 : 0;
          
          calculations[`${jobType}_materials`] = {
            blocks: { quantity: blocksNeeded, type: "Concrete masonry units", heightCategory },
            gravel: { cubicYards: gravelYards, type: "Drainage gravel" },
            concrete: { cubicYards: concreteYards, type: "Foundation concrete" },
            geogrid: wallHeight > 2 ? { linearFeet: wallLength * Math.ceil(wallHeight), type: "Geogrid reinforcement" } : null,
            drainage: { linearFeet: wallLength, type: "French drain pipe" },
          };
        }
      }

      // Pergola calculations
      if (jobType.includes("Pergolas")) {
        const pergolaDims = jobData.jobSpecificAnswers[`${jobType}_pergola_dimensions`];
        if (pergolaDims && pergolaDims.length && pergolaDims.width) {
          const length = parseFloat(pergolaDims.length);
          const width = parseFloat(pergolaDims.width);
          const area = length * width;
          
          calculations[`${jobType}_materials`] = {
            posts: { quantity: 4, size: "6x6x10", material: "Pressure treated" },
            beams: { quantity: 2, size: `2x12x${Math.ceil(width)}`, material: "Pressure treated" },
            rafters: { quantity: Math.ceil(length / 2) + 1, size: `2x8x${Math.ceil(width)}` },
            hardware: { bolts: 8, hangers: Math.ceil(length / 2), brackets: 4 },
            concrete: { bags: 8, type: "Fast-set concrete for footings" }
          };
        }
      }

      // Hardscaping calculations
      if (jobType.includes("Hardscaping")) {
        const hardscapeArea = parseFloat(jobData.jobSpecificAnswers[`${jobType}_hardscape_area`] || "0");
        const material = jobData.jobSpecificAnswers[`${jobType}_hardscape_material`];
        
        if (hardscapeArea > 0) {
          const baseNeeded = Math.ceil((hardscapeArea * 4) / 12 / 27); // 4" base in cubic yards
          const sandNeeded = Math.ceil((hardscapeArea * 1) / 12 / 27); // 1" sand in cubic yards
          
          calculations[`${jobType}_materials`] = {
            pavers: { squareFeet: Math.ceil(hardscapeArea * 1.05), material, waste: "5%" },
            base: { cubicYards: baseNeeded, type: "Crushed stone base" },
            sand: { cubicYards: sandNeeded, type: "Concrete sand" },
            edging: { linearFeet: Math.ceil(Math.sqrt(hardscapeArea) * 4), type: "Plastic edging" },
            fabric: { squareFeet: hardscapeArea, type: "Landscape fabric" }
          };
        }
      }

      // Retaining Wall calculations
      if (jobType.includes("Retaining Walls")) {
        const wallLength = parseFloat(jobData.jobSpecificAnswers[`${jobType}_wall_length`] || "0");
        const wallHeight = jobData.jobSpecificAnswers[`${jobType}_wall_height`] || "2-3 feet";
        
        if (wallLength > 0) {
          const avgHeight = parseFloat(wallHeight.split('-')[0]) || 2; // Get average height
          const blocks = Math.ceil(wallLength * avgHeight * 2.25); // 2.25 blocks per sq ft
          
          calculations[`${jobType}_materials`] = {
            blocks: { quantity: blocks, type: "Segmental retaining wall blocks" },
            gravel: { cubicYards: Math.ceil(wallLength * 2 * 1.5 / 27), type: "Crushed gravel" },
            drainage: { linearFeet: wallLength, type: "4\" perforated drain pipe" },
            fabric: { squareFeet: wallLength * avgHeight, type: "Geotextile fabric" }
          };
        }
      }

      // Roofing calculations
      if (jobType.includes("Roofs")) {
        const roofArea = parseFloat(jobData.jobSpecificAnswers[`${jobType}_roof_area`] || "0");
        const roofMaterial = jobData.jobSpecificAnswers[`${jobType}_roof_material`] || "Asphalt shingles";
        
        if (roofArea > 0) {
          const squares = Math.ceil(roofArea / 100); // 1 square = 100 sq ft
          const shinglesNeeded = squares * 3; // 3 bundles per square
          const underlaymentRolls = Math.ceil(roofArea / 400); // 400 sq ft per roll
          
          calculations[`${jobType}_materials`] = {
            shingles: { squares, bundles: shinglesNeeded, material: roofMaterial },
            underlayment: { rolls: underlaymentRolls, type: "Synthetic underlayment" },
            flashing: { linearFeet: Math.ceil(roofArea * 0.1), type: "Step flashing" },
            nails: { pounds: squares * 2.5, type: "Roofing nails" },
            ridgeCap: { linearFeet: Math.ceil(roofArea * 0.05), type: "Ridge cap shingles" }
          };
        }
      }


      // Painting calculations with Wood Iron featured
      if (jobType.includes("Painting")) {
        const paintArea = parseFloat(jobData.jobSpecificAnswers[`${jobType}_paint_area`] || "0");
        const paintType = jobData.jobSpecificAnswers[`${jobType}_paint_type`] || "Wood Iron Premium";
        if (paintArea > 0) {
          let coverage = 400; // Default coverage
          if (paintType.includes("Wood Iron Premium")) coverage = 187; // Average of 175-200
          if (paintType.includes("Wood Iron Semi-Solid")) coverage = 212; // Average of 200-225
          
          calculations[`${jobType}_materials`] = {
            primer: { gallons: Math.ceil(paintArea / 350) },
            paint: { 
              gallons: Math.ceil(paintArea / coverage),
              type: paintType,
              coverage: `${coverage} sq ft/gal`,
              durability: paintType.includes("Wood Iron") ? "8-15 years" : "5-10 years"
            },
            supplies: { brushes: 2, rollers: 3, dropCloths: Math.ceil(paintArea / 200) }
          };
        }
      }

      // Basement Renovating calculations
      if (jobType.includes("Basement Renovating")) {
        const basementArea = parseFloat(jobData.jobSpecificAnswers[`${jobType}_basement_area`] || "0");
        const ceilingHeight = jobData.jobSpecificAnswers[`${jobType}_ceiling_height`] || "7-8 feet";
        if (basementArea > 0) {
          calculations[`${jobType}_materials`] = {
            framing: { 
              studs: Math.ceil((basementArea * 0.1) * 1.2), // Perimeter framing plus partition walls
              plates: Math.ceil(basementArea * 0.05),
              material: "Pressure treated bottom plates"
            },
            insulation: {
              wallInsulation: Math.ceil(basementArea * 0.4), // Wall perimeter
              rValue: INSULATION_RVALUES.colorado.basement,
              type: "Fiberglass batts or spray foam"
            },
            drywall: { sheets: Math.ceil(basementArea * 0.4) },
            flooring: { squareFeet: basementArea },
            electrical: { outlets: Math.ceil(basementArea / 150), lighting: Math.ceil(basementArea / 200) },
            moistureControl: ceilingHeight.includes("Under 7") ? "Required - low ceiling considerations" : "Standard vapor barrier"
          };
        }
      }
    });

    return calculations;
  }, [jobData.jobSpecificAnswers, jobData.jobTypes]);

  useEffect(() => {
    setJobData((prev) => ({ ...prev, calculations: calculateMaterials }));
  }, [calculateMaterials]);

  // Auto-populate stain color from customer input and detect color change
  useEffect(() => {
    if (jobData.paintStainColors) {
      jobData.jobTypes.forEach(jobType => {
        if (jobType.includes("Refinishing")) {
          const currentColor = jobData.jobSpecificAnswers[`${jobType}_current_stain_paint_color`] || "";
          const desiredColor = jobData.paintStainColors;

          // Auto-populate desired color in the estimate
          setJobData((prev) => ({
            ...prev,
            jobSpecificAnswers: {
              ...prev.jobSpecificAnswers,
              [`${jobType}_desired_stain_paint_color`]: desiredColor,
            }
          }));

          // Detect color change
          const isColorChange = currentColor.trim().toLowerCase() !== desiredColor.trim().toLowerCase() &&
                                currentColor.trim() !== "" &&
                                desiredColor.trim() !== "";

          // Store color change flag
          setJobData((prev) => ({
            ...prev,
            jobSpecificAnswers: {
              ...prev.jobSpecificAnswers,
              [`${jobType}_is_color_change`]: isColorChange,
            }
          }));
        }
      });
    }
  }, [jobData.paintStainColors, jobData.jobTypes]);

  // Auto-calculate number of steps from stair railing measurements
  useEffect(() => {
    jobData.jobTypes.forEach(jobType => {
      if (jobType.includes("Decks")) {
        const stairRailingLinearFt = parseFloat(jobData.jobSpecificAnswers[`${jobType}_total_stair_railing_linear_ft`] || "0");
        const railingSides = jobData.jobSpecificAnswers[`${jobType}_stair_railing_sides`];

        if (stairRailingLinearFt > 0 && railingSides) {
          // Adjust railing length based on sides
          let singleSideRailing = stairRailingLinearFt;
          if (railingSides === "Both sides") {
            singleSideRailing = stairRailingLinearFt / 2;
          }

          // Convert to inches
          const railingLengthInches = singleSideRailing * 12;

          // Using typical stair geometry:
          // Railing length is the hypotenuse
          // Typical rise:run ratio is 7:10 (7" rise, 10" tread)
          // hypotenuse = sqrt(rise² + run²)
          // If we know hypotenuse, we can solve for number of steps
          // Each step: sqrt(7² + 10²) = sqrt(149) = 12.2 inches of railing
          const inchesPerStep = Math.sqrt(Math.pow(7, 2) + Math.pow(10, 2)); // ~12.2 inches
          const numberOfSteps = Math.round(railingLengthInches / inchesPerStep);

          setJobData((prev) => ({
            ...prev,
            jobSpecificAnswers: {
              ...prev.jobSpecificAnswers,
              [`${jobType}_calculated_number_of_steps`]: numberOfSteps,
            }
          }));
        }
      }
    });
  }, [jobData.jobTypes, jobData.jobSpecificAnswers]);

  // Data sharing between job types - auto-populate common fields
  useEffect(() => {
    if (jobData.jobTypes.length <= 1) return; // Only run if multiple job types selected

    const updates: Record<string, any> = {};
    let hasUpdates = false;

    // Get all question IDs from all job types to identify common questions
    const allQuestions = new Set<string>();
    jobData.jobTypes.forEach(jobType => {
      const questions = getJobQuestions(jobType);
      const currentQuestions = getCurrentConditionQuestions(jobType.split(" - ")[0]);
      const recommendedQuestions = getRecommendedRepairsQuestions(jobType.split(" - ")[0], jobType.split(" - ")[1]);

      [...questions, ...currentQuestions, ...recommendedQuestions].forEach(q => {
        allQuestions.add(q.id);
      });
    });

    // For each common question, sync the value across job types
    allQuestions.forEach(questionId => {
      // Find the first job type that has a value for this question
      let sourceValue: any = null;
      let sourceJobType: string | null = null;

      for (const jobType of jobData.jobTypes) {
        const key = `${jobType}_${questionId}`;
        const value = jobData.jobSpecificAnswers[key];

        if (value !== undefined && value !== null && value !== "" &&
            !(Array.isArray(value) && value.length === 0)) {
          sourceValue = value;
          sourceJobType = jobType;
          break;
        }
      }

      // If we found a source value, propagate it to other job types that don't have it
      if (sourceValue !== null && sourceJobType !== null) {
        for (const jobType of jobData.jobTypes) {
          if (jobType === sourceJobType) continue; // Skip the source

          const targetKey = `${jobType}_${questionId}`;
          const targetValue = jobData.jobSpecificAnswers[targetKey];

          // Only update if target doesn't have a value
          if (targetValue === undefined || targetValue === null || targetValue === "" ||
              (Array.isArray(targetValue) && targetValue.length === 0)) {
            updates[targetKey] = sourceValue;
            hasUpdates = true;
          }
        }
      }
    });

    // Apply all updates at once
    if (hasUpdates) {
      setJobData((prev) => ({
        ...prev,
        jobSpecificAnswers: {
          ...prev.jobSpecificAnswers,
          ...updates,
        }
      }));
    }
  }, [jobData.jobTypes, jobData.jobSpecificAnswers]);

  // ---------------------------
  // Cost Estimate Calculation
  // ---------------------------
  const costEstimate = useMemo(() => {
    // Only calculate for Deck projects
    const deckJob = jobData.jobTypes.find(jt => jt.includes("Decks"));
    if (!deckJob) return null;

    const answers = jobData.jobSpecificAnswers;
    const dimensions = answers[`${deckJob}_main_deck_dimensions`];

    if (!dimensions || !Array.isArray(dimensions)) return null;

    const totalSqFt = dimensions.reduce((total: number, dim: any) => {
      return total + (parseFloat(dim.length || 0) * parseFloat(dim.width || 0));
    }, 0);

    if (totalSqFt === 0) return null;

    // Extract key measurements
    const deckingMaterial = answers[`${deckJob}_decking_material`] || "Pressure Treated Pine";
    const joistLinearFeet = parseFloat(answers[`${deckJob}_joist_linear_feet`] || "0");
    const beamLinearFeet = parseFloat(answers[`${deckJob}_beam_linear_feet`] || "0") +
                          parseFloat(answers[`${deckJob}_second_beam_linear_feet`] || "0");
    const posts = parseInt(answers[`${deckJob}_total_columns_needed`] || "0");
    const levelRailingFt = parseFloat(answers[`${deckJob}_total_level_railing_linear_ft`] || "0");
    const stairRailingFt = parseFloat(answers[`${deckJob}_total_stair_railing_linear_ft`] || "0");
    const totalRailingFt = levelRailingFt + stairRailingFt;
    const railingMaterial = answers[`${deckJob}_railing_material`] || "Pressure Treated";
    const numStairs = parseInt(answers[`${deckJob}_number_of_staircases`] || "0");

    return estimateDeckCost({
      squareFootage: totalSqFt,
      deckingMaterial,
      joistLinearFeet,
      beamLinearFeet,
      posts,
      railingLinearFeet: totalRailingFt,
      railingMaterial,
      stairs: numStairs,
      permitRequired: jobData.permitRequired,
      painInTheAssCharge: jobData.painInTheAssCharge,
    });
  }, [jobData.jobTypes, jobData.jobSpecificAnswers, jobData.permitRequired, jobData.painInTheAssCharge]);

  // ---------------------------
  // Permit requirements
  // ---------------------------
const getPermitRequirements = (): string[] | null => {
  if (!jobData.permitRequired) return null;

  const requirements: string[] = [];
  jobData.jobTypes.forEach((jobType) => {
    if (jobType.includes("Decks")) {
      const height = parseFloat(jobData.jobSpecificAnswers[`${jobType}_deck_height`] || "0");
      if (height > 2.5) requirements.push("Any attached Deck Higher than 30\" requires a building permit and railings");
    }
    
    if (jobType.includes("Retaining Walls")) {
      const wallHeight = parseFloat(jobData.jobSpecificAnswers[`${jobType}_wall_height`] || "0");
      if (wallHeight > 3) requirements.push("Retaining wall over 3 feet typically requires building permit");
    }
    
    if (jobType.includes("Pergolas")) {
      const dims = jobData.jobSpecificAnswers[`${jobType}_structure_dimensions`];
      if (dims && Array.isArray(dims) && dims[0]?.length && dims[0]?.width) {
        const area = parseFloat(dims[0].length || 0) * parseFloat(dims[0].width || 0);
        if (area > 200) requirements.push("Pergola over 200 sq ft typically requires a building permit");
      }
    }
    
    if (jobType.includes("Roofs")) {
      requirements.push("Roofing work typically requires building permit and inspections");
    }
  });
  
  return requirements;
};

// Helper function to format time ago
const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

// GPS location functions - MUST BE DEFINED BEFORE USE
const getCurrentLocation = () => {
  setIsLoadingLocation(true);
  setLocationError(null);

  if (!navigator.geolocation) {
    setLocationError("Your browser doesn't support GPS location.");
    setIsLoadingLocation(false);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // Fetch city information using reverse geocoding
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`
        );
        const data = await response.json();
        const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || "Unknown";
        const state = data.address?.state || "";
        const county = data.address?.county || "";
        const cityCode = `${city}, ${county}, ${state}`.replace(", ,", ",").trim();

        // Determine building code requirements based on location
        const buildingCodeInfo = getBuildingCodeInfo(state, lat, lng);

        setJobData((prev) => ({
          ...prev,
          gpsLat: lat,
          gpsLng: lng,
          cityCode: cityCode,
          liveLoad: buildingCodeInfo.liveLoad,
          snowLoad: buildingCodeInfo.snowLoad
        }));
      } catch (error) {
        // If geocoding fails, still set the coordinates
        setJobData((prev) => ({
          ...prev,
          gpsLat: lat,
          gpsLng: lng
        }));
      }
      setIsLoadingLocation(false);
    },
    (error) => {
      setLocationError(`Couldn't get location: ${error.message}`);
      setIsLoadingLocation(false);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
  );
};

// Helper function to determine building code requirements based on location
const getBuildingCodeInfo = (state: string, lat: number, lng: number) => {
  // Default values (IRC 2021 minimum requirements)
  let liveLoad = 40; // psf - standard residential deck
  let snowLoad = 0; // psf - varies by region

  // State-specific and region-specific adjustments
  const stateUpper = state?.toUpperCase() || "";

  // Snow load regions (rough estimates based on climate zones)
  if (["ME", "VT", "NH", "NY", "MI", "WI", "MN", "ND", "SD", "MT", "WY", "ID"].includes(stateUpper)) {
    snowLoad = 40; // Heavy snow regions
  } else if (stateUpper === "CO") {
    snowLoad = 30; // Colorado specific code requirement
  } else if (["MA", "RI", "CT", "PA", "OH", "IN", "IL", "IA", "NE", "UT"].includes(stateUpper)) {
    snowLoad = 25; // Moderate snow regions
  } else if (["NJ", "DE", "MD", "WV", "VA", "KY", "MO", "KS", "NM", "NV", "OR", "WA"].includes(stateUpper)) {
    snowLoad = 15; // Light snow regions
  } else {
    snowLoad = 0; // Minimal to no snow (Southern states, coastal areas)
  }

  // High elevation adjustments
  if (lat > 40 && lng < -105) { // Rocky Mountain region approximation
    snowLoad = Math.max(snowLoad, 50);
  }

  return { liveLoad, snowLoad };
};

// ---------------------------
// Initialize
// ---------------------------
useEffect(() => {
  setJobData((prev) => ({ ...prev, visitDate: new Date().toISOString().slice(0, 10) }));
  getCurrentLocation();
}, []);

// Update validation on data change
useEffect(() => {
  const errors = validateForm();
  setValidationErrors(errors);
}, [jobData]);

// Auto-save to localStorage every 30 seconds
useEffect(() => {
  const autoSaveTimer = setInterval(() => {
    // Only auto-save if there's meaningful data
    if (jobData.estimatorName || jobData.customerName || jobData.jobTypes.length > 0) {
      setAutoSaving(true);
      try {
        const draftData = {
          jobData,
          uploadedFiles,
          drawings,
          savedAt: new Date().toISOString()
        };
        localStorage.setItem('estimator_draft', JSON.stringify(draftData));
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setTimeout(() => setAutoSaving(false), 500); // Show "Saving..." briefly
      }
    }
  }, 30000); // Auto-save every 30 seconds

  return () => clearInterval(autoSaveTimer);
}, [jobData, uploadedFiles, drawings]);

// Recover draft on component mount
useEffect(() => {
  const draftJson = localStorage.getItem('estimator_draft');
  if (draftJson) {
    try {
      const draft = JSON.parse(draftJson);
      const savedAt = new Date(draft.savedAt);
      const hoursSinceSave = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);

      // Only offer to recover if draft is less than 24 hours old
      if (hoursSinceSave < 24) {
        const shouldRecover = window.confirm(
          `Found a draft saved ${formatTimeAgo(savedAt)}. Would you like to recover it?`
        );

        if (shouldRecover) {
          setJobData(draft.jobData);
          setUploadedFiles(draft.uploadedFiles || []);
          setDrawings(draft.drawings || []);
          setLastSaved(savedAt);
        } else {
          localStorage.removeItem('estimator_draft');
        }
      } else {
        // Auto-delete old drafts
        localStorage.removeItem('estimator_draft');
      }
    } catch (error) {
      console.error('Failed to recover draft:', error);
      localStorage.removeItem('estimator_draft');
    }
  }
}, []);

// Load Google Places API
useEffect(() => {
  // Check if script already loaded
  if (window.google && window.google.maps && window.google.maps.places?.AutocompleteService) {
    setGooglePlacesLoaded(true);
    return;
  }

  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDQ_IOlk4nOKx8pXKhBtMuugtbVvyOEYfs&libraries=places`;
  script.async = true;
  script.defer = true;
  script.onload = () => {
    // Wait for places library to fully initialize
    const checkPlaces = () => {
      if (window.google?.maps?.places?.AutocompleteService) {
        setGooglePlacesLoaded(true);
      } else {
        setTimeout(checkPlaces, 100);
      }
    };
    checkPlaces();
  };
  document.head.appendChild(script);

  return () => {
    // Cleanup if needed
  };
}, []);

// Event handlers
const handleJobTypeChange = (jobType: string, checked: boolean) => {
  setJobData((prev) => ({
    ...prev,
    jobTypes: checked ? [...prev.jobTypes, jobType] : prev.jobTypes.filter((t) => t !== jobType),
  }));
};

const handleSameAddressChange = (checked: boolean) => {
  setJobData((prev) => ({
    ...prev,
    sameAsCustomerAddress: checked,
    projectAddress: checked ? prev.customerAddress : prev.projectAddress,
  }));
};

const handleJobAnswer = (jobType: string, questionId: string, value: any) => {
  setJobData((prev) => ({
    ...prev,
    jobSpecificAnswers: { ...prev.jobSpecificAnswers, [`${jobType}_${questionId}`]: value },
  }));
};

const toggleSection = (sectionId: string) => {
  setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
};

// Smart calculation warnings
const getCalculationWarnings = () => {
  const warnings: Array<{ type: 'warning' | 'error' | 'info'; message: string }> = [];

  jobData.jobTypes.forEach(jobType => {
    if (jobType.includes("Decks")) {
      const dimensions = jobData.jobSpecificAnswers[`${jobType}_main_deck_dimensions`];
      const joistSize = jobData.jobSpecificAnswers[`${jobType}_joist_size`];
      const joistSpacing = jobData.jobSpecificAnswers[`${jobType}_joist_spacing`];
      const beamLinearFeet = parseFloat(jobData.jobSpecificAnswers[`${jobType}_beam_linear_feet`] || "0");

      // Check for unusual dimensions
      if (dimensions && Array.isArray(dimensions)) {
        dimensions.forEach((dim: any, idx: number) => {
          const length = parseFloat(dim.length || 0);
          const width = parseFloat(dim.width || 0);

          if (width === 0 || length === 0) {
            warnings.push({
              type: 'error',
              message: `Deck section ${idx + 1}: Width or length is 0 ft. Please verify measurements.`
            });
          }

          if (width < 0 || length < 0) {
            warnings.push({
              type: 'error',
              message: `Deck section ${idx + 1}: Negative measurements detected. Please correct.`
            });
          }

          if (width > 40 || length > 40) {
            warnings.push({
              type: 'warning',
              message: `Deck section ${idx + 1}: Very large dimensions (${length}' x ${width}'). Please verify measurements.`
            });
          }

          if (length > 100 || width > 100) {
            warnings.push({
              type: 'error',
              message: `Deck section ${idx + 1}: Extremely large dimensions detected. This may require professional engineering.`
            });
          }

          // Joist span warnings based on joist size
          if (joistSize && width > 0) {
            if (joistSize === "2x6" && width > 9) {
              warnings.push({
                type: 'warning',
                message: `Deck section ${idx + 1}: 2x6 joists may not span ${width} ft safely. Consider 2x8 or 2x10 joists.`
              });
            }

            if (joistSize === "2x8" && width > 12) {
              warnings.push({
                type: 'warning',
                message: `Deck section ${idx + 1}: 2x8 joists may not span ${width} ft safely at ${joistSpacing}. Consider 2x10 or 2x12 joists.`
              });
            }

            if (joistSize === "2x10" && width > 16) {
              warnings.push({
                type: 'warning',
                message: `Deck section ${idx + 1}: 2x10 joists may not span ${width} ft safely. Consider 2x12 joists or additional beams.`
              });
            }
          }
        });
      }

      // Beam warnings
      if (beamLinearFeet > 0 && beamLinearFeet > 20) {
        warnings.push({
          type: 'info',
          message: `Long beam span (${beamLinearFeet} ft). Verify beam size is adequate for load and span.`
        });
      }
    }
  });

  // Budget warnings
  if (jobData.projectValue > 0 && jobData.projectValue < 1000) {
    warnings.push({
      type: 'warning',
      message: `Budget seems low ($${jobData.projectValue.toLocaleString()}). Please verify with customer.`
    });
  }

  if (jobData.projectValue > 100000) {
    warnings.push({
      type: 'info',
      message: `High-value project ($${jobData.projectValue.toLocaleString()}). Consider detailed scope documentation.`
    });
  }

  return warnings;
};

// Customer search and history functions
const searchCustomers = async (searchTerm: string) => {
  if (!searchTerm || searchTerm.length < 2) {
    setSearchResults([]);
    setShowSearchResults(false);
    return;
  }

  setIsSearching(true);
  try {
    const jobsRef = collection(db, "jobs");

    // Search by name (case-insensitive partial match)
    const nameQuery = query(
      jobsRef,
      where("customerName", ">=", searchTerm),
      where("customerName", "<=", searchTerm + '\uf8ff'),
      orderBy("customerName"),
      limit(10)
    );

    const nameSnapshot = await getDocs(nameQuery);
    const results: any[] = [];
    const seenCustomers = new Set();

    nameSnapshot.forEach((doc) => {
      const data = doc.data();
      const customerKey = `${data.customerName}-${data.customerPhone}`;

      if (!seenCustomers.has(customerKey)) {
        results.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp || data.visitDate
        });
        seenCustomers.add(customerKey);
      }
    });

    // Also try searching by phone if search term looks like a phone number
    if (/\d{3}/.test(searchTerm)) {
      const phoneQuery = query(
        jobsRef,
        where("customerPhone", ">=", searchTerm),
        where("customerPhone", "<=", searchTerm + '\uf8ff'),
        limit(10)
      );

      const phoneSnapshot = await getDocs(phoneQuery);
      phoneSnapshot.forEach((doc) => {
        const data = doc.data();
        const customerKey = `${data.customerName}-${data.customerPhone}`;

        if (!seenCustomers.has(customerKey)) {
          results.push({
            id: doc.id,
            ...data,
            timestamp: data.timestamp || data.visitDate
          });
          seenCustomers.add(customerKey);
        }
      });
    }

    setSearchResults(results);
    setShowSearchResults(results.length > 0);
  } catch (error) {
    console.error("Error searching customers:", error);
    setSearchResults([]);
  } finally {
    setIsSearching(false);
  }
};

const loadCustomerHistory = async (customerName: string, customerPhone: string) => {
  try {
    const jobsRef = collection(db, "jobs");
    const historyQuery = query(
      jobsRef,
      where("customerName", "==", customerName),
      where("customerPhone", "==", customerPhone),
      orderBy("timestamp", "desc"),
      limit(20)
    );

    const historySnapshot = await getDocs(historyQuery);
    const history: any[] = [];

    historySnapshot.forEach((doc) => {
      history.push({
        id: doc.id,
        ...doc.data()
      });
    });

    setCustomerHistory(history);
    setShowCustomerHistory(history.length > 0);
  } catch (error) {
    console.error("Error loading customer history:", error);
    setCustomerHistory([]);
  }
};

const selectCustomer = (customer: any) => {
  // Auto-fill customer information
  setJobData((prev) => ({
    ...prev,
    customerName: customer.customerName || "",
    customerPhone: customer.customerPhone || "",
    customerEmail: customer.customerEmail || "",
    customerAddress: customer.customerAddress || "",
    projectAddress: customer.projectAddress || customer.customerAddress || "",
    sameAsCustomerAddress: customer.sameAsCustomerAddress || false,
    newCustomer: false,
  }));

  // Load customer history
  if (customer.customerName && customer.customerPhone) {
    loadCustomerHistory(customer.customerName, customer.customerPhone);
  }

  // Close search results
  setShowSearchResults(false);
  setCustomerSearch("");
};

const shouldShowQuestion = (question: JobQuestion, jobType: string, structureNumber?: number) => {
  if (question.permitOnly && !jobData.permitRequired) return false;
  if (!question.dependency) return true;

  // Build the dependency key - use structure prefix if this is a per-structure question
  const depKey = structureNumber && question.perStructure
    ? `${jobType}_structure_${structureNumber}_${question.dependency}`
    : `${jobType}_${question.dependency}`;

  const depValue = jobData.jobSpecificAnswers[depKey];

  // Handle special dependency values
  if (question.dependencyValue === "hasValue") {
    return depValue !== undefined && depValue !== null && depValue !== "" && depValue > 0;
  }

  // Handle checkbox-multiple Yes/No questions
  if (Array.isArray(depValue)) {
    if (question.dependencyValue === true) {
      return depValue.includes("Yes");
    } else if (question.dependencyValue === false) {
      return depValue.includes("No");
    }
  }

  // Handle regular dependency checks
  if (Array.isArray(question.dependencyValue)) return (question.dependencyValue as any[]).includes(depValue);
  return depValue === question.dependencyValue;
};

const groupQuestionsByCategory = (questions: JobQuestion[]) => {
  const grouped: Record<string, { current: JobQuestion[], recommended: JobQuestion[], general: JobQuestion[] }> = {};

  questions.forEach((q) => {
    const c = q.category || "General";
    if (!grouped[c]) grouped[c] = { current: [], recommended: [], general: [] };

    if (q.section === "current") {
      grouped[c].current.push(q);
    } else if (q.section === "recommended") {
      grouped[c].recommended.push(q);
    } else {
      grouped[c].general.push(q);
    }
  });

  return grouped;
};

const getFieldError = (fieldName: string) => {
  return validationErrors.find(error => error.field === fieldName);
};

// Mock file upload handler (replace with actual upload logic)
const handleFileUpload = (files: FileList) => {
  Array.from(files).forEach((file) => {
    const mockUrl = URL.createObjectURL(file);
    const newFile: UploadedFile = {
      url: mockUrl,
      name: file.name,
      size: file.size,
      type: file.type,
      notes: "",
    };
    setUploadedFiles(prev => [...prev, newFile]);
  });
};

const updateFileNotes = (index: number, notes: string) => {
  setUploadedFiles((prev) => prev.map((f, i) => (i === index ? { ...f, notes } : f)));
};

const removeFile = (index: number) => {
  setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
};

// Firebase Configuration & Real Save Function
const firebaseConfig = {
  apiKey: "AIzaSyD0ExhXCsNr_V_deefbKBV2uBDytkEtFQo",
  authDomain: "pocket-estimator-5c6a6.firebaseapp.com",
  databaseURL: "https://pocket-estimator-5c6a6-default-rtdb.firebaseio.com",
  projectId: "pocket-estimator-5c6a6",
  storageBucket: "pocket-estimator-5c6a6.firebasestorage.app",
  messagingSenderId: "933041576825",
  appId: "1:933041576825:web:838ea316bb6d50468fada8",
  measurementId: "G-9XRTBQ95KY"
};

// Initialize Firebase (in a real app, this would be in a separate firebase.js file)
const initializeFirebase = async () => {
  try {
    // Dynamic import to avoid SSR issues
    const { initializeApp } = await import('firebase/app');
    const { getFirestore, collection, addDoc, serverTimestamp } = await import('firebase/firestore');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    return { db, collection, addDoc, serverTimestamp };
  } catch (error) {
    console.error('Firebase initialization error:', error);
    return null;
  }
};

// Real Firestore save function
const saveJobToFirestore = async (jobRecord: any) => {
  const firebase = await initializeFirebase();
  if (!firebase) {
    throw new Error('Firebase initialization failed');
  }
  
  const { db, collection, addDoc, serverTimestamp } = firebase;
  
  // Add server timestamp
  const recordWithTimestamp = {
    ...jobRecord,
    createdAt: serverTimestamp(),
    lastModified: serverTimestamp(),
  };
  
  // Save to Firestore
  const docRef = await addDoc(collection(db, 'estimates'), recordWithTimestamp);
  return docRef.id;
};

// Email export function 
// Helper function to generate estimate body (reused for email and preview)
const generateEstimateBody = (jobRecord: any) => {
  // Helper function to extract current condition data
  const getCurrentConditions = () => {
    const conditions: string[] = [];
    Object.entries(jobRecord.jobSpecificAnswers).forEach(([key, value]) => {
      if (key.includes('current_') && value) {
        const jobType = key.split('_current_')[0];
        const field = key.split('_current_')[1];
        if (typeof value === 'object' && value !== null && 'condition' in value) {
          const conditionObj = value as { condition: string; notes?: string };
          conditions.push(`${jobType} - ${field}: ${conditionObj.condition} (${conditionObj.notes || 'No notes'})`);
        } else {
          conditions.push(`${jobType} - ${field}: ${JSON.stringify(value)}`);
        }
      }
    });
    return conditions;
  };

  // Helper function to extract recommended repairs data
  const getRecommendedRepairs = () => {
    const repairs: string[] = [];
    Object.entries(jobRecord.jobSpecificAnswers).forEach(([key, value]) => {
      if (key.includes('recommended_') && value) {
        const jobType = key.split('_recommended_')[0];
        const field = key.split('_recommended_')[1];
        if (typeof value === 'object' && value !== null && 'description' in value) {
          const repairObj = value as { description: string; priority?: string };
          repairs.push(`${jobType} - ${field}: ${repairObj.description} (Priority: ${repairObj.priority || 'Not specified'})`);
        } else {
          repairs.push(`${jobType} - ${field}: ${JSON.stringify(value)}`);
        }
      }
    });
    return repairs;
  };

  // Helper function to extract addons
  const getAddons = () => {
    const addons: string[] = [];
    Object.entries(jobRecord.jobSpecificAnswers).forEach(([key, value]) => {
      if (key.includes('_addons') && value && Array.isArray(value)) {
        const jobType = key.split('_addons')[0];
        value.forEach((addon: string) => {
          addons.push(`${jobType}: ${addon}`);
        });
      } else if (key.includes('deck_addons') && value && Array.isArray(value)) {
        value.forEach((addon: string) => {
          addons.push(addon);
        });
      }
    });
    return addons;
  };

  // Create formatted estimate body
  return `
═══════════════════════════════════════════════════════════════
                    DECK DOCTOR ESTIMATE
═══════════════════════════════════════════════════════════════

📋 CUSTOMER INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Customer Name:      ${jobRecord.customerName}
   Phone:              ${jobRecord.customerPhone || 'Not provided'}
   Email:              ${jobRecord.customerEmail || 'Not provided'}
   Customer Address:   ${jobRecord.customerAddress || 'Not provided'}
   Project Address:    ${jobRecord.projectAddress || 'Same as customer address'}
   Customer Grade:     ${jobRecord.customerGrade || 'Not rated'}
   Customer Type:      ${jobRecord.newCustomer ? 'New Customer' : 'Returning Customer'}
   ${jobRecord.newCustomer && jobRecord.referralSource ? `Referral Source:    ${jobRecord.referralSource}` : ''}
   ${jobRecord.hasReferrals ? `Has Referrals:      YES ($250 program mentioned)` : ''}
   ${jobRecord.hasReferrals && jobRecord.referralInfo ? `Referral Info:      ${jobRecord.referralInfo.replace(/\n/g, '\n                       ')}` : ''}
   Samples Needed:     ${jobRecord.needsSamples ? 'YES' : 'NO'}
   ${jobRecord.needsSamples && jobRecord.sampleTypes ? `Sample Types:       ${jobRecord.sampleTypes.replace(/\n/g, '\n                       ')}` : ''}
   ${jobRecord.gateCode ? `Gate/Door Code:     ${jobRecord.gateCode}` : ''}
   ${jobRecord.paintStainColors ? `Paint/Stain Colors: ${jobRecord.paintStainColors}${(() => {
     const refinishingJob = jobRecord.jobTypes.find((jt: string) => jt.includes("Refinishing"));
     if (refinishingJob) {
       const isColorChange = jobRecord.jobSpecificAnswers[`${refinishingJob}_is_color_change`];
       const currentColor = jobRecord.jobSpecificAnswers[`${refinishingJob}_current_stain_paint_color`];
       return isColorChange ? `\n   ⚠️  COLOR CHANGE: From "${currentColor}" to "${jobRecord.paintStainColors}"\n   📈 IMPORTANT: Color change significantly increases labor costs (extra prep, primer, coats)` : '';
     }
     return '';
   })()}` : ''}
   ${jobRecord.scheduleRequirements ? `Timeline/Schedule:  ${jobRecord.scheduleRequirements}` : ''}

💼 PROJECT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Project Types:      ${jobRecord.jobTypes.join(', ')}
   Estimator:          ${jobRecord.estimatorName}
   Visit Date:         ${jobRecord.visitDate}
   Budget:             $${jobRecord.projectValue.toLocaleString()}
   Permit Required:    ${jobRecord.permitRequired ? 'YES' : 'NO'}
   ${jobRecord.painInTheAssCharge > 0 ? `PITA Charge:        $${jobRecord.painInTheAssCharge.toLocaleString()} (Unusual difficulty/complexity)` : ''}

📍 LOCATION & CODES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   GPS Coordinates:    ${jobRecord.gpsLat.toFixed(6)}, ${jobRecord.gpsLng.toFixed(6)}
   City Code:          ${jobRecord.cityCode || 'Not specified'}
   Live Load:          ${jobRecord.liveLoad ? jobRecord.liveLoad + ' psf' : 'Not specified'}
   Snow Load:          ${jobRecord.snowLoad ? jobRecord.snowLoad + ' psf' : 'Not specified'}

${getCurrentConditions().length > 0 ? `
🔍 CURRENT CONDITIONS ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${getCurrentConditions().map(c => `   • ${c}`).join('\n')}
` : ''}

${getRecommendedRepairs().length > 0 ? `
🔧 RECOMMENDED REPAIRS & CHANGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${getRecommendedRepairs().map(r => `   • ${r}`).join('\n')}
` : ''}

${getAddons().length > 0 ? `
✨ SPECIAL ADD-ONS & FEATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${getAddons().map(a => `   • ${a}`).join('\n')}
` : ''}

${jobRecord.generalNotes ? `
📝 GENERAL NOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${jobRecord.generalNotes.split('\n').map((line: string) => `   ${line}`).join('\n')}
` : ''}

${jobRecord.measurementNotes ? `
📐 MEASUREMENT NOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${jobRecord.measurementNotes.split('\n').map((line: string) => `   ${line}`).join('\n')}
` : ''}

${jobRecord.estimatorNotes ? `
✅ ESTIMATOR FOLLOW-UP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${jobRecord.estimatorNotes.split('\n').map((line: string) => `   ${line}`).join('\n')}
` : ''}

${Object.entries(jobRecord.calculations).filter(([key]) => key.includes('materials')).length > 0 ? `
📦 MATERIALS SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${Object.entries(jobRecord.calculations)
  .filter(([key]) => key.includes('materials'))
  .map(([key, materials]) => {
    const jobType = key.replace('_materials', '');
    return `\n   ${jobType.toUpperCase()}:\n   ${'-'.repeat(60)}\n${JSON.stringify(materials, null, 2).split('\n').map(line => `   ${line}`).join('\n')}`;
  }).join('\n\n')}
` : ''}

═══════════════════════════════════════════════════════════════
                Generated with Deck Doctor Estimator v3.0.0
                      ${new Date().toLocaleDateString()}
═══════════════════════════════════════════════════════════════
`;
};

const emailEstimate = (jobRecord: any) => {
  const subject = `Estimate: ${jobRecord.customerName} - ${jobRecord.jobTypes.join(', ')}`;
  const emailBody = generateEstimateBody(jobRecord);
  const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
  window.open(mailtoLink);
};

const showEstimatePreview = () => {
  const jobRecord = {
    ...jobData,
    files: uploadedFiles,
    permitRequirements: getPermitRequirements(),
    coloradoCodes: COLORADO_CODES,
    estimatorVersion: "3.0.0",
    exportedAt: new Date().toISOString(),
  };
  const content = generateEstimateBody(jobRecord);
  setPreviewContent(content);
  setShowPreview(true);
};

const saveJobToFirebase = async () => {
  setIsSaving(true);
  
  // Validate before saving
  const errors = validateForm();
  if (errors.length > 0) {
    alert(`Please fix the following errors before saving:\n\n${errors.map(e => `• ${e.message}`).join('\n')}`);
    setIsSaving(false);
    return;
  }
  
  try {
    const jobRecord = {
      ...jobData,
      files: uploadedFiles,
      permitRequirements: getPermitRequirements(),
      coloradoCodes: COLORADO_CODES,
      estimatorVersion: "3.0.0",
      validationPassed: true,
      deviceInfo: {
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    };
    
    // Save to Firestore
    const documentId = await saveJobToFirestore(jobRecord);
    console.log(`✅ Estimate saved to Firestore with ID: ${documentId}`);
    alert(`✅ Estimate saved successfully!\n\nDocument ID: ${documentId}\n\nYour estimate is now backed up in the cloud and accessible from the office.`);
  } catch (error) {
    console.error('Save error:', error);
    alert(`❌ Error saving estimate: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or contact support if the problem persists.`);
  } finally {
    setIsSaving(false);
  }
};

const exportMaterialsList = () => {
  const rows: string[] = ["jobType,category,key,value"];
  Object.entries(jobData.calculations)
    .filter(([key]) => key.includes("materials"))
    .forEach(([jobKey, mats]) => {
      const jobType = jobKey.replace("_materials", "");
      const walk = (prefix: string, obj: any) => {
        if (obj && typeof obj === "object") {
          Object.entries(obj).forEach(([k, v]) => walk(`${prefix}/${k}`, v));
        } else {
          rows.push(`${JSON.stringify(jobType)},${JSON.stringify(prefix)},,${JSON.stringify(String(obj))}`);
        }
      };
      walk("root", mats);
    });
    
  const csv = rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `materials_export_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Question rendering component
const renderQuestion = (question: JobQuestion, jobType: string, structureNumber?: number) => {
  // If structureNumber is provided, prefix the question ID with structure_N_
  const effectiveQuestionId = structureNumber
    ? `structure_${structureNumber}_${question.id}`
    : question.id;
  const fieldKey = `${jobType}_${effectiveQuestionId}`;
  const value = jobData.jobSpecificAnswers[fieldKey];
  const error = getFieldError(fieldKey);
  const hasError = !!error;
  const notesKey = `${fieldKey}_notes`;
  const notesValue = jobData.jobSpecificAnswers[notesKey] || "";

  // For dependencies in per-structure questions, also prefix the dependency key
  const getDependencyValue = (depId: string) => {
    const depKey = structureNumber
      ? `${jobType}_structure_${structureNumber}_${depId}`
      : `${jobType}_${depId}`;
    return jobData.jobSpecificAnswers[depKey];
  };

  // Helper to get the correct question ID for handleJobAnswer
  const getQuestionIdForAnswer = (baseId: string) => {
    return structureNumber ? `structure_${structureNumber}_${baseId}` : baseId;
  };

  const baseInputClasses = `w-full p-3 border-2 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium bg-white ${
    hasError ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'
  }`;

  const renderMainInput = () => {
    switch (question.type) {
      case "text":
        return (
          <input
            type="text"
            value={value || ""}
            onChange={(e) => handleJobAnswer(jobType, getQuestionIdForAnswer(question.id), e.target.value)}
            className={baseInputClasses}
            placeholder={`Enter ${question.question.toLowerCase()}`}
          />
        );

      case "number":
        return (
          <div className="flex">
            <input
              type="number"
              value={value || ""}
              onChange={(e) => handleJobAnswer(jobType, getQuestionIdForAnswer(question.id), e.target.value)}
              className={baseInputClasses}
              placeholder="0"
            />
            {question.unit && (
              <span className="inline-flex items-center px-3 bg-gray-200 border-2 border-l-0 border-gray-300 rounded-r-md text-gray-700 font-medium">
                {question.unit}
              </span>
            )}
          </div>
        );

      case "select":
        return (
          <select
            value={value || ""}
            onChange={(e) => handleJobAnswer(jobType, getQuestionIdForAnswer(question.id), e.target.value)}
            className={baseInputClasses}
          >
            <option value="">Select...</option>
            {question.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case "select-with-other":
        const otherChecked = jobData.jobSpecificAnswers[`${fieldKey}_other_checked`];
        const otherText = jobData.jobSpecificAnswers[`${fieldKey}_other_text`];
        
        return (
          <div className="space-y-2">
            <select
              value={otherChecked ? "other" : (value || "")}
              onChange={(e) => {
                if (e.target.value === "other") {
                  handleJobAnswer(jobType, `${getQuestionIdForAnswer(question.id)}_other_checked`, true);
                } else {
                  handleJobAnswer(jobType, getQuestionIdForAnswer(question.id), e.target.value);
                  handleJobAnswer(jobType, `${getQuestionIdForAnswer(question.id)}_other_checked`, false);
                }
              }}
              className={baseInputClasses}
            >
              <option value="">Select...</option>
              {question.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              {question.allowOther && <option value="other">Other (specify)</option>}
            </select>
            
            {otherChecked && (
              <input
                type="text"
                value={otherText || ""}
                onChange={(e) => handleJobAnswer(jobType, `${getQuestionIdForAnswer(question.id)}_other_text`, e.target.value)}
                className={baseInputClasses}
                placeholder="Please specify..."
              />
            )}
          </div>
        );

      case "checkbox":
        return (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleJobAnswer(jobType, getQuestionIdForAnswer(question.id), e.target.checked)}
              className="mr-3 w-5 h-5"
            />
            <span className={`text-sm font-medium ${hasError ? 'text-red-700' : 'text-gray-900'}`}>
              {question.question}
            </span>
          </label>
        );

      case "checkbox-multiple":
        const selectedValues = value || [];
        return (
          <div className="space-y-2">
            {question.options?.map((option) => (
              <label key={option} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleJobAnswer(jobType, getQuestionIdForAnswer(question.id), [...selectedValues, option]);
                    } else {
                      handleJobAnswer(jobType, getQuestionIdForAnswer(question.id), selectedValues.filter((v: string) => v !== option));
                    }
                  }}
                  className="mr-3 w-4 h-4"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case "textarea":
        return (
          <textarea
            value={value || ""}
            onChange={(e) => handleJobAnswer(jobType, getQuestionIdForAnswer(question.id), e.target.value)}
            className={baseInputClasses}
            rows={3}
            placeholder={`Enter ${question.question.toLowerCase()}...`}
          />
        );

      case "multiple-dimensions":
        const dimensions = value || [{ length: "", width: "" }];
        return (
          <div className="space-y-3">
            {dimensions.map((dim: any, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="number"
                  placeholder="Length"
                  value={dim.length || ""}
                  onChange={(e) => {
                    const newDims = [...dimensions];
                    newDims[index] = { ...newDims[index], length: e.target.value };
                    handleJobAnswer(jobType, getQuestionIdForAnswer(question.id), newDims);
                  }}
                  className={baseInputClasses.replace('w-full', 'flex-1')}
                />
                <span className="text-gray-500">×</span>
                <input
                  type="number"
                  placeholder="Width"
                  value={dim.width || ""}
                  onChange={(e) => {
                    const newDims = [...dimensions];
                    newDims[index] = { ...newDims[index], width: e.target.value };
                    handleJobAnswer(jobType, getQuestionIdForAnswer(question.id), newDims);
                  }}
                  className={baseInputClasses.replace('w-full', 'flex-1')}
                />
                <span className="text-gray-500 text-sm">ft</span>
                {dimensions.length > 1 && (
                  <button
                    onClick={() => {
                      const newDims = dimensions.filter((_: any, i: number) => i !== index);
                      handleJobAnswer(jobType, getQuestionIdForAnswer(question.id), newDims);
                    }}
                    className="p-2 text-red-600 hover:bg-red-100 rounded"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => {
                const newDims = [...dimensions, { length: "", width: "" }];
                handleJobAnswer(jobType, getQuestionIdForAnswer(question.id), newDims);
              }}
              className="flex items-center px-3 py-2 text-blue-600 hover:bg-blue-100 rounded font-medium"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add section
            </button>
          </div>
        );

      case "material-condition":
        return (
          <div className="space-y-3">
            <select
              value={(value as MaterialCondition)?.condition || ""}
              onChange={(e) => handleJobAnswer(jobType, getQuestionIdForAnswer(question.id), { ...(value as MaterialCondition), condition: e.target.value })}
              className={baseInputClasses}
            >
              <option value="">Select condition...</option>
              <option value="Excellent">Excellent - Like new</option>
              <option value="Good">Good - Minor wear</option>
              <option value="Fair">Fair - Moderate wear/issues</option>
              <option value="Poor">Poor - Significant problems</option>
              <option value="Failed">Failed - Needs replacement</option>
            </select>
            <textarea
              value={(value as MaterialCondition)?.notes || ""}
              onChange={(e) => handleJobAnswer(jobType, getQuestionIdForAnswer(question.id), { ...(value as MaterialCondition), notes: e.target.value })}
              className={baseInputClasses}
              rows={2}
              placeholder="Detailed condition notes, specific issues observed..."
            />
            <input
              type="text"
              value={(value as MaterialCondition)?.measurements || ""}
              onChange={(e) => handleJobAnswer(jobType, getQuestionIdForAnswer(question.id), { ...(value as MaterialCondition), measurements: e.target.value })}
              className={baseInputClasses}
              placeholder="Current measurements (if applicable)"
            />
          </div>
        );

      case "condition-assessment":
      case "repair-recommendation":
        return (
          <div className="space-y-3">
            <textarea
              value={(value as RepairRecommendation)?.description || ""}
              onChange={(e) => handleJobAnswer(jobType, getQuestionIdForAnswer(question.id), { ...(value as RepairRecommendation), description: e.target.value })}
              className={baseInputClasses}
              rows={3}
              placeholder={question.type === "condition-assessment" ?
                "Describe current condition, materials, and any issues..." : 
                "Describe recommended repairs, materials, and timeline..."}
            />
            <input
              type="text"
              value={(value as RepairRecommendation)?.priority || ""}
              onChange={(e) => handleJobAnswer(jobType, getQuestionIdForAnswer(question.id), { ...(value as RepairRecommendation), priority: e.target.value })}
              className={baseInputClasses}
              placeholder={question.type === "condition-assessment" ?
                "Issues priority level" : 
                "Repair priority (High/Medium/Low)"}
            />
            <input
              type="text"
              value={(value as RepairRecommendation)?.cost_estimate || ""}
              onChange={(e) => handleJobAnswer(jobType, getQuestionIdForAnswer(question.id), { ...(value as RepairRecommendation), cost_estimate: e.target.value })}
              className={baseInputClasses}
              placeholder="Estimated cost ($)"
            />
          </div>
        );

      case "calculation-display":
        if (question.id === "permit_info") {
          const requirements = getPermitRequirements();
          return requirements ? (
            <div className="p-4 bg-orange-100 rounded-lg border-l-4 border-orange-500">
              <h4 className="font-bold text-orange-800 mb-2">Permit Requirements</h4>
              {requirements.map((req, index) => (
                <p key={index} className="text-sm text-orange-700">• {req}</p>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-gray-100 rounded-lg">
              <p className="text-gray-600">Complete project details to see permit requirements</p>
            </div>
          );
        } else if (question.id === "railing_code_warning") {
          // Railing code warning function moved inside component to access jobData
          const deckHeight = parseFloat(jobData.jobSpecificAnswers[`${jobType}_deck_height`] || "0");
          const railingNeeded = jobData.jobSpecificAnswers[`${jobType}_railing_needed`];

          if (deckHeight > 2.5 && !railingNeeded) {
            return (
              <div className="p-4 bg-red-100 border-2 border-red-400 rounded-md">
                <div className="flex items-center mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                  <span className="font-bold text-red-800">CODE VIOLATION WARNING</span>
                </div>
                <div className="text-red-700 font-medium">
                  <p>⚠️ Deck height is {deckHeight} feet - RAILINGS ARE REQUIRED BY CODE</p>
                  <p>Colorado building code requires railings on decks over 30 inches (2.5 feet) high.</p>
                  <p className="mt-2 font-bold">Please check "Will this deck have railings?" above.</p>
                </div>
              </div>
            );
          } else if (deckHeight > 2.5 && railingNeeded) {
            return (
              <div className="p-4 bg-green-100 border-2 border-green-400 rounded-md">
                <div className="flex items-center mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  <span className="font-bold text-green-800">CODE COMPLIANT</span>
                </div>
                <p className="text-green-700 font-medium">✅ Deck height {deckHeight} feet with railings - meets Colorado building code requirements.</p>
              </div>
            );
          } else if (deckHeight <= 2.5) {
            return (
              <div className="p-4 bg-blue-100 border-2 border-blue-400 rounded-md">
                <div className="flex items-center mb-2">
                  <Calculator className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="font-bold text-blue-800">CODE INFORMATION</span>
                </div>
                <p className="text-blue-700 font-medium">ℹ️ Deck height {deckHeight} feet - railings optional (under 30" threshold).</p>
              </div>
            );
          }
          return null;
        } else if (question.id === "stair_calculation") {
          const deckHeight = parseFloat(jobData.jobSpecificAnswers[`${jobType}_deck_height`] || "0");
          const stairDesign = jobData.jobSpecificAnswers[`${jobType}_stair_design`];
          
          if (deckHeight > 0) {
            // Calculate based on 2 treads per foot (6 inches per tread)
            const estimatedTreads = Math.ceil(deckHeight * 2);
            const riserHeight = (deckHeight * 12) / estimatedTreads; // Convert to inches
            
            // Auto-populate the number of steps
            const currentSteps = jobData.jobSpecificAnswers[`${jobType}_number_of_steps`];
            if (!currentSteps || currentSteps !== estimatedTreads) {
              setTimeout(() => {
                handleJobAnswer(jobType, 'number_of_steps', estimatedTreads);
              }, 100);
            }
            
            return (
              <div className="p-4 bg-white rounded-lg border-2 border-green-600">
                <h4 className="font-bold text-gray-900 mb-3 text-base">Automatic Stair Calculation</h4>
                <div className="space-y-2 text-sm text-gray-900">
                  <p><strong className="text-gray-900">Deck Height:</strong> {deckHeight} feet ({(deckHeight * 12).toFixed(1)} inches)</p>
                  <p><strong className="text-gray-900">Calculated Treads:</strong> {estimatedTreads} steps</p>
                  <p><strong className="text-gray-900">Riser Height:</strong> {riserHeight.toFixed(1)} inches per step</p>
                  <p className="text-gray-700 text-xs mt-2">
                    <strong className="text-gray-900">Note:</strong> Calculation based on 2 treads per foot (6" per tread standard).
                    {stairDesign && <span> Design: {stairDesign}</span>}
                  </p>
                </div>
              </div>
            );
          } else {
            return (
              <div className="p-4 bg-gray-100 rounded-lg">
                <p className="text-gray-600 text-sm">Enter deck height above to see automatic stair calculation</p>
              </div>
            );
          }
        } else if (question.id === "photo_video_reminder") {
          const handleTakePhoto = () => {
            // This will integrate with device camera
            alert("Photo capture functionality would integrate with device camera here.\nFiles will be automatically named with:\n- Date/time stamp\n- Customer name\n- Project location\n- GPS coordinates embedded in metadata");
          };
          
          const handleTakeVideo = () => {
            // This will integrate with device camera for video
            alert("Video capture functionality would integrate with device camera here.\nFiles will be automatically named with:\n- Date/time stamp\n- Customer name\n- Project location\n- GPS coordinates embedded in metadata");
          };
          
          return (
            <div className="p-4 bg-blue-100 rounded-lg border-l-4 border-blue-500">
              <h4 className="font-bold text-blue-800 mb-3">Documentation Capture</h4>
              <p className="text-blue-700 mb-4">Capture photos and videos for this project. Files will be automatically tagged with customer info, location, and GPS data.</p>
              <div className="flex gap-4">
                <button
                  onClick={handleTakePhoto}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  📸 Take Photos
                </button>
                <button
                  onClick={handleTakeVideo}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                >
                  🎥 Record Video
                </button>
              </div>
            </div>
          );
        } else if (question.id === "calculated_number_of_steps") {
          const numberOfSteps = jobData.jobSpecificAnswers[`${jobType}_calculated_number_of_steps`];
          const stairRailingLinearFt = jobData.jobSpecificAnswers[`${jobType}_total_stair_railing_linear_ft`];
          const railingSides = jobData.jobSpecificAnswers[`${jobType}_stair_railing_sides`];

          if (numberOfSteps && stairRailingLinearFt) {
            return (
              <div className="p-4 bg-blue-100 rounded-lg border-l-4 border-blue-500">
                <div className="flex items-center mb-2">
                  <Calculator className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="font-bold text-blue-800">Auto-Calculated from Railing Measurements</span>
                </div>
                <p className="text-blue-900 text-lg font-bold">{numberOfSteps} steps</p>
                <p className="text-blue-700 text-sm mt-1">
                  Based on {stairRailingLinearFt} linear ft of railing ({railingSides})
                </p>
                <p className="text-blue-600 text-xs mt-1">
                  Calculation uses typical 7" rise and 10" tread dimensions
                </p>
              </div>
            );
          } else {
            return (
              <div className="p-4 bg-gray-100 rounded-lg">
                <p className="text-gray-600 text-sm">Enter stair railing measurements above to calculate number of steps</p>
              </div>
            );
          }
        }
        return null;

      case "material-list":
        // Simple text area for materials notes
        return (
          <textarea
            value={value || ""}
            onChange={(e) => handleJobAnswer(jobType, getQuestionIdForAnswer(question.id), e.target.value)}
            className={baseInputClasses + " min-h-[150px]"}
            placeholder="Enter materials list and notes..."
          />
        );

      case "add-sections":
        const sections = value || [{ description: "" }];
        return (
          <div className="space-y-3">
            {sections.map((section: any, index: number) => (
              <div key={index} className="p-3 border border-gray-200 rounded-md bg-gray-50">
                <div className="flex items-start space-x-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Area {index + 1}</label>
                    <textarea
                      placeholder={question.placeholder || "Describe this area..."}
                      value={section.description || ""}
                      onChange={(e) => {
                        const newSections = [...sections];
                        newSections[index] = { ...newSections[index], description: e.target.value };
                        handleJobAnswer(jobType, getQuestionIdForAnswer(question.id), newSections);
                      }}
                      className={baseInputClasses}
                      rows={3}
                    />
                  </div>
                  {sections.length > 1 && (
                    <button
                      onClick={() => {
                        const newSections = sections.filter((_: any, i: number) => i !== index);
                        handleJobAnswer(jobType, getQuestionIdForAnswer(question.id), newSections);
                      }}
                      className="p-2 text-red-600 hover:bg-red-100 rounded mt-6"
                      title="Remove this area"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                const newSections = [...sections, { description: "" }];
                handleJobAnswer(jobType, getQuestionIdForAnswer(question.id), newSections);
              }}
              className="flex items-center px-4 py-2 text-blue-600 hover:bg-blue-100 rounded font-medium border border-blue-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another Area
            </button>
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value || ""}
            onChange={(e) => handleJobAnswer(jobType, getQuestionIdForAnswer(question.id), e.target.value)}
            className={baseInputClasses}
            placeholder={`Enter ${question.question.toLowerCase()}`}
          />
        );
    }
  };

  return (
    <div>
      {renderMainInput()}
      {hasError && (
        <p className="text-red-600 text-sm mt-1 font-medium flex items-center">
          <AlertTriangle className="w-4 h-4 mr-1" />
          {error.message}
        </p>
      )}
      {question.type !== "calculation-display" && question.type !== "material-list" && (
        <div className="mt-2">
          <input
            type="text"
            value={notesValue}
            onChange={(e) => handleJobAnswer(jobType, `${getQuestionIdForAnswer(question.id)}_notes`, e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700 text-sm bg-gray-50"
            placeholder="Additional notes for this question..."
          />
        </div>
      )}
    </div>
  );
};


// Main component render
return (
  <div className="min-h-screen py-6 px-4">
    <div className="max-w-6xl mx-auto">
      {/* Modern Header Card */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Calculator className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  Professional Field Estimator
                </h1>
                <p className="text-blue-100 text-sm mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white">
                    Colorado Licensed
                  </span>
                  <span className="text-blue-200">Deck Doctor</span>
                </p>
              </div>
            </div>

            {/* Auto-Save Status Indicator */}
            <div className="flex items-center gap-3">
              {autoSaving ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-lg">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-white text-sm font-medium">Saving...</span>
                </div>
              ) : lastSaved ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-300" />
                  <span className="text-white/80 text-sm">Saved {formatTimeAgo(lastSaved)}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
      {/* Validation Summary */}
      {validationErrors.length > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-red-800">Please Complete Required Fields</h3>
              <p className="text-red-600 text-sm">
                {validationErrors.length} field(s) need attention before saving.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Basic Information */}
      <div className="mb-8 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-5 py-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            Basic Information
          </h2>
        </div>
        <div className="p-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Estimator Name *
            </label>
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="estimator"
                  value="Brandon"
                  checked={jobData.estimatorName === "Brandon"}
                  onChange={(e) => setJobData((prev) => ({ ...prev, estimatorName: e.target.value }))}
                  className="mr-3 w-5 h-5"
                />
                <span className="text-sm font-medium text-gray-900">Brandon</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="estimator"
                  value="Justin"
                  checked={jobData.estimatorName === "Justin"}
                  onChange={(e) => setJobData((prev) => ({ ...prev, estimatorName: e.target.value }))}
                  className="mr-3 w-5 h-5"
                />
                <span className="text-sm font-medium text-gray-900">Justin</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="estimator"
                  value="Garrett"
                  checked={jobData.estimatorName === "Garrett"}
                  onChange={(e) => setJobData((prev) => ({ ...prev, estimatorName: e.target.value }))}
                  className="mr-3 w-5 h-5"
                />
                <span className="text-sm font-medium text-gray-900">Garrett</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="estimator"
                  value="Other"
                  checked={jobData.estimatorName !== "" && jobData.estimatorName !== "Brandon" && jobData.estimatorName !== "Justin" && jobData.estimatorName !== "Garrett"}
                  onChange={(e) => setJobData((prev) => ({ ...prev, estimatorName: "" }))}
                  className="mr-3 w-5 h-5"
                />
                <span className="text-sm font-medium text-gray-900">Other</span>
              </label>
              {jobData.estimatorName !== "" && jobData.estimatorName !== "Brandon" && jobData.estimatorName !== "Justin" && jobData.estimatorName !== "Garrett" && (
                <input
                  type="text"
                  value={jobData.estimatorName}
                  onChange={(e) => setJobData((prev) => ({ ...prev, estimatorName: e.target.value }))}
                  className="w-full p-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium bg-white ml-8"
                  placeholder="Enter estimator name"
                />
              )}
            </div>
            {getFieldError("estimatorName") && (
              <p className="text-red-600 text-sm mt-1 font-medium flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1" />
                {getFieldError("estimatorName")?.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              <Calendar className="inline w-4 h-4 mr-1" />
              Visit Date
            </label>
            <input
              type="date"
              value={jobData.visitDate}
              onChange={(e) => setJobData((prev) => ({ ...prev, visitDate: e.target.value }))}
              className="w-full p-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-bold bg-white"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            <MapPin className="inline w-4 h-4 mr-1" />
            GPS Location *
          </label>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={
                  jobData.gpsLat !== 0
                    ? `${jobData.gpsLat.toFixed(6)}, ${jobData.gpsLng.toFixed(6)}`
                    : "No location yet"
                }
                readOnly
                className={`w-full p-3 border-2 rounded-md text-gray-900 font-bold ${
                  getFieldError("gpsLocation") ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50'
                }`}
              />
            </div>
            <button
              onClick={getCurrentLocation}
              disabled={isLoadingLocation}
              className="px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap font-bold"
            >
              {isLoadingLocation ? "Getting..." : "Get GPS"}
            </button>
          </div>
          {locationError && (
            <p className="text-red-600 text-sm mt-1 font-medium">{locationError}</p>
          )}
          {getFieldError("gpsLocation") && (
            <p className="text-red-600 text-sm mt-1 font-medium flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1" />
              {getFieldError("gpsLocation")?.message}
            </p>
          )}
        </div>

        {/* Crew Assignment */}
        <div className="mt-6 p-4 bg-white rounded-lg border-2 border-blue-300">
          <label className="block text-sm font-bold text-gray-900 mb-3">
            Assigned Crew *
          </label>
          <div className="space-y-3">
            <label className="flex items-center cursor-pointer p-3 rounded hover:bg-blue-50 transition-colors">
              <input
                type="radio"
                name="assignedCrew"
                value="Alex"
                checked={jobData.assignedCrew === "Alex"}
                onChange={(e) => setJobData((prev) => ({ ...prev, assignedCrew: e.target.value }))}
                className="mr-3 w-5 h-5"
              />
              <div className="flex-1">
                <span className="text-base font-bold text-gray-900">Crew A - Alex's Crew</span>
                <span className="ml-3 text-sm font-medium text-green-600">($166/hour)</span>
              </div>
            </label>

            <label className="flex items-center cursor-pointer p-3 rounded hover:bg-blue-50 transition-colors">
              <input
                type="radio"
                name="assignedCrew"
                value="Huber"
                checked={jobData.assignedCrew === "Huber"}
                onChange={(e) => setJobData((prev) => ({ ...prev, assignedCrew: e.target.value }))}
                className="mr-3 w-5 h-5"
              />
              <div className="flex-1">
                <span className="text-base font-bold text-gray-900">Crew B - Huber's Crew</span>
                <span className="ml-3 text-sm font-medium text-blue-600">($95/hour)</span>
              </div>
            </label>

            <label className="flex items-center cursor-pointer p-3 rounded hover:bg-blue-50 transition-colors">
              <input
                type="radio"
                name="assignedCrew"
                value="Both"
                checked={jobData.assignedCrew === "Both"}
                onChange={(e) => setJobData((prev) => ({ ...prev, assignedCrew: e.target.value }))}
                className="mr-3 w-5 h-5"
              />
              <div className="flex-1">
                <span className="text-base font-bold text-gray-900">Both Crews</span>
                <span className="ml-3 text-sm font-medium text-purple-600">(Different parts of job)</span>
              </div>
            </label>
          </div>

          <div className="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-500">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> Labor hours entered in questions will be calculated using the selected crew's hourly rate. If "Both Crews" is selected, specify crew assignment in question notes.
            </p>
          </div>
        </div>
      </div>

      {/* Job Type Selection */}
      <div className="mb-8 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <BarChart className="w-4 h-4 text-white" />
            </div>
            Project Types
          </h2>
        </div>
        <div className="p-6">
        {getFieldError("jobTypes") && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
            <p className="text-red-700 text-sm font-medium flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1" />
              {getFieldError("jobTypes")?.message}
            </p>
          </div>
        )}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(jobTypeCategories).map(([category, details]) => (
            <div key={category} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
              <h3 className="font-bold text-gray-800 mb-3 pb-2 border-b border-gray-100">{category}</h3>
              <div className="space-y-2">
                {details.subcategories.map((sub) => {
                  const jobTypeKey = `${category} - ${sub}`;
                  return (
                    <label key={sub} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={jobData.jobTypes.includes(jobTypeKey)}
                        onChange={(e) => handleJobTypeChange(jobTypeKey, e.target.checked)}
                        className="mr-3 w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">{sub}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="mb-8 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Home className="w-4 h-4 text-white" />
            </div>
            Customer Information
          </h2>
        </div>
        <div className="p-6">
        {/* Customer Search */}
        <div className="mb-6 p-4 bg-white rounded-xl border border-blue-200 shadow-sm">
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Search Existing Customer
          </label>
          <div className="relative">
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                searchCustomers(e.target.value);
              }}
              className="w-full p-3 pr-10 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium bg-white"
              placeholder="Search by name or phone number..."
            />
            {isSearching && (
              <div className="absolute right-3 top-3.5">
                <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
          </div>

          {/* Search Results */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="mt-3 max-h-60 overflow-y-auto bg-white border-2 border-gray-200 rounded-md shadow-lg">
              {searchResults.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => selectCustomer(result)}
                  className="w-full text-left p-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="font-bold text-gray-900">{result.customerName}</div>
                  <div className="text-sm text-gray-600">{result.customerPhone}</div>
                  <div className="text-xs text-gray-500">{result.customerAddress}</div>
                </button>
              ))}
            </div>
          )}

          {showSearchResults && searchResults.length === 0 && customerSearch.length >= 2 && !isSearching && (
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600">
              No customers found matching "{customerSearch}"
            </div>
          )}
        </div>

        {/* Customer History */}
        {showCustomerHistory && customerHistory.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center">
              <ClipboardList className="w-5 h-5 mr-2" />
              Customer History ({customerHistory.length} past jobs)
            </h3>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {customerHistory.map((job, idx) => (
                <div key={idx} className="p-3 bg-white rounded border border-gray-200 text-sm">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="font-bold text-gray-800">
                        {job.jobTypes?.join(", ") || "N/A"}
                      </div>
                      <div className="text-gray-600 text-xs mt-1">
                        {job.visitDate || new Date(job.timestamp).toLocaleDateString()}
                        {job.estimatorName && ` • ${job.estimatorName}`}
                      </div>
                      {job.projectValue && (
                        <div className="text-green-700 font-bold mt-1">
                          Budget: ${job.projectValue.toLocaleString()}
                        </div>
                      )}
                      {job.paintStainColors && (
                        <div className="text-gray-600 text-xs mt-1">
                          Colors: {job.paintStainColors}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm('Copy job details from this previous estimate? This will overwrite current data.')) {
                          setJobData((prev) => ({
                            ...prev,
                            jobTypes: job.jobTypes || prev.jobTypes,
                            projectValue: job.projectValue || prev.projectValue,
                            paintStainColors: job.paintStainColors || prev.paintStainColors,
                            scheduleRequirements: job.scheduleRequirements || prev.scheduleRequirements,
                            permitRequired: job.permitRequired || prev.permitRequired,
                            painInTheAssCharge: job.painInTheAssCharge || prev.painInTheAssCharge,
                            jobSpecificAnswers: job.jobSpecificAnswers || prev.jobSpecificAnswers,
                          }));
                          alert('Previous estimate data copied successfully!');
                        }
                      }}
                      className="px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 transition whitespace-nowrap flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🔄 HAND iPAD TO CUSTOMER - START */}
        <div className="mb-6 p-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-xl">
          <h3 className="text-2xl font-bold text-white text-center flex items-center justify-center">
            <User className="w-8 h-8 mr-3" />
            👋 PLEASE HAND iPAD TO CUSTOMER
          </h3>
          <p className="text-center text-blue-100 mt-2 text-lg">Customer: Please fill out your information below</p>
        </div>

        <div className="mb-6 p-6 bg-white rounded-lg border-4 border-blue-400 shadow-lg">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-lg font-bold text-gray-900 mb-3">
                Your Name *
              </label>
              <input
                type="text"
                value={jobData.customerName}
                onChange={(e) => setJobData((prev) => ({ ...prev, customerName: e.target.value }))}
                className={`w-full p-4 text-lg border-3 rounded-lg focus:ring-4 focus:ring-blue-500 text-gray-900 font-medium bg-white ${
                  getFieldError("customerName") ? 'border-red-500 bg-red-50' : 'border-gray-400 focus:border-blue-500'
                }`}
                placeholder="Enter your full name"
              />
              {getFieldError("customerName") && (
                <p className="text-red-600 text-sm mt-2 font-bold flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-1" />
                  {getFieldError("customerName")?.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-lg font-bold text-gray-900 mb-3">
                Phone Number *
              </label>
              <input
                type="tel"
                value={jobData.customerPhone}
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value);
                  setJobData((prev) => ({ ...prev, customerPhone: formatted }));
                }}
                className="w-full p-4 text-lg border-3 border-gray-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium bg-white"
                placeholder="(555) 123-4567"
                maxLength={14}
              />
            </div>
            <div>
              <label className="block text-lg font-bold text-gray-900 mb-3">
                Email Address
              </label>
              <input
                type="email"
                value={jobData.customerEmail}
                onChange={(e) => setJobData((prev) => ({ ...prev, customerEmail: e.target.value }))}
                className={`w-full p-4 text-lg border-3 rounded-lg focus:ring-4 focus:ring-blue-500 text-gray-900 font-medium bg-white ${
                  jobData.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(jobData.customerEmail)
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-gray-400 focus:border-blue-500'
                }`}
                placeholder="your@email.com"
              />
              {jobData.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(jobData.customerEmail) && (
                <p className="text-yellow-700 text-sm mt-2 font-medium flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Please enter a valid email address
                </p>
              )}
            </div>
          <div>
              <label className="block text-lg font-bold text-gray-900 mb-3">
                Your Address
              </label>
              <AddressAutocomplete
                value={jobData.customerAddress}
                onChange={(address) => setJobData((prev) => ({ ...prev, customerAddress: address }))}
                placeholder="Start typing your address..."
                className="w-full p-4 text-lg border-3 border-gray-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium bg-white"
                googlePlacesLoaded={googlePlacesLoaded}
              />
            </div>
          </div>

          <div className="mt-6 pt-6 border-t-2 border-gray-300">
            <h4 className="text-xl font-bold text-gray-900 mb-4">A few quick questions:</h4>

            <div className="space-y-4">
              <div>
                <label className="block text-lg font-bold text-gray-900 mb-3">
                  Are you a new or returning customer?
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setJobData((prev) => ({ ...prev, newCustomer: true }))}
                    className={`flex-1 p-4 text-lg font-bold rounded-lg border-3 transition-all ${
                      jobData.newCustomer
                        ? 'bg-blue-600 text-white border-blue-700 shadow-lg'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    New Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setJobData((prev) => ({ ...prev, newCustomer: false, referralSource: "" }))}
                    className={`flex-1 p-4 text-lg font-bold rounded-lg border-3 transition-all ${
                      !jobData.newCustomer
                        ? 'bg-blue-600 text-white border-blue-700 shadow-lg'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    Returning Customer
                  </button>
                </div>
              </div>

              {jobData.newCustomer && (
                <div>
                  <label className="block text-lg font-bold text-gray-900 mb-3">
                    How did you hear about us?
                  </label>
                  <select
                    value={jobData.referralSource}
                    onChange={(e) => setJobData((prev) => ({ ...prev, referralSource: e.target.value }))}
                    className="w-full p-4 text-lg border-3 border-gray-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium bg-white"
                  >
                    <option value="">Select one...</option>
                    <option value="Google Search">Google Search</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Nextdoor">Nextdoor</option>
                    <option value="Angi/HomeAdvisor">Angi/HomeAdvisor</option>
                    <option value="Thumbtack">Thumbtack</option>
                    <option value="Referral from Friend/Family">Referral from Friend/Family</option>
                    <option value="Yard Sign">Yard Sign</option>
                    <option value="Drive By">Drive By</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-lg font-bold text-gray-900 mb-3">
                  What's your budget for this project?
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-4 text-2xl text-gray-600">$</span>
                  <input
                    type="number"
                    value={jobData.projectValue || ""}
                    onChange={(e) => setJobData((prev) => ({ ...prev, projectValue: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-4 pl-10 text-lg border-3 border-gray-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-bold bg-white"
                    placeholder="10,000"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center cursor-pointer p-4 bg-purple-100 rounded-lg border-2 border-purple-300 hover:bg-purple-200 transition">
                  <input
                    type="checkbox"
                    checked={jobData.hasReferrals}
                    onChange={(e) => setJobData((prev) => ({ ...prev, hasReferrals: e.target.checked }))}
                    className="mr-4 w-6 h-6"
                  />
                  <span className="text-lg font-bold text-gray-900">
                    I can refer friends/family (get $250 per referral!)
                  </span>
                </label>
              </div>

              <div>
                <label className="flex items-center cursor-pointer p-4 bg-green-100 rounded-lg border-2 border-green-300 hover:bg-green-200 transition">
                  <input
                    type="checkbox"
                    checked={jobData.needsSamples}
                    onChange={(e) => setJobData((prev) => ({ ...prev, needsSamples: e.target.checked }))}
                    className="mr-4 w-6 h-6"
                  />
                  <span className="text-lg font-bold text-gray-900">
                    I'd like to see material samples
                  </span>
                </label>
              </div>

              {jobData.needsSamples && (
                <div>
                  <label className="block text-lg font-bold text-gray-900 mb-3">
                    What types of samples?
                  </label>
                  <textarea
                    value={jobData.sampleTypes}
                    onChange={(e) => setJobData((prev) => ({ ...prev, sampleTypes: e.target.value }))}
                    className="w-full p-4 text-lg border-3 border-gray-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium bg-white"
                    placeholder="e.g., Composite decking colors, Railing materials, Stain colors"
                    rows={3}
                  />
                </div>
              )}

              <div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={jobData.hasScheduleRequirements}
                    onChange={(e) => setJobData((prev) => ({
                      ...prev,
                      hasScheduleRequirements: e.target.checked,
                      scheduleRequirements: e.target.checked ? prev.scheduleRequirements : ""
                    }))}
                    className="mr-3 w-6 h-6"
                  />
                  <span className="text-lg font-bold text-gray-900">
                    Do you have any timeline or scheduling requirements?
                  </span>
                </label>
                {jobData.hasScheduleRequirements && (
                  <textarea
                    value={jobData.scheduleRequirements}
                    onChange={(e) => setJobData((prev) => ({ ...prev, scheduleRequirements: e.target.value }))}
                    className="w-full p-4 text-lg border-3 border-gray-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium bg-white mt-3"
                    placeholder="e.g., Must be completed by June 15th, Only available on weekends"
                    rows={3}
                  />
                )}
              </div>

              <div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={jobData.hasGateCode}
                    onChange={(e) => setJobData((prev) => ({
                      ...prev,
                      hasGateCode: e.target.checked,
                      gateCode: e.target.checked ? prev.gateCode : ""
                    }))}
                    className="mr-3 w-6 h-6"
                  />
                  <span className="text-lg font-bold text-gray-900">
                    Gate/Door Code (if we need access)
                  </span>
                </label>
                {jobData.hasGateCode && (
                  <input
                    type="text"
                    value={jobData.gateCode}
                    onChange={(e) => setJobData((prev) => ({ ...prev, gateCode: e.target.value }))}
                    className="w-full p-4 text-lg border-3 border-gray-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium bg-white mt-3"
                    placeholder="Enter gate or door access code"
                  />
                )}
              </div>

              {jobData.hasReferrals && (
                <div>
                  <label className="block text-lg font-bold text-gray-900 mb-3">
                    Referral Contact Information
                  </label>
                  <textarea
                    value={jobData.referralInfo}
                    onChange={(e) => setJobData((prev) => ({ ...prev, referralInfo: e.target.value }))}
                    className="w-full p-4 text-lg border-3 border-gray-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium bg-white"
                    placeholder="Names, phone numbers, and/or email addresses of people you're referring"
                    rows={3}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 🔄 END CUSTOMER SECTION - Return iPad to Estimator */}
        <div className="mb-8 p-6 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg shadow-xl">
          <h3 className="text-2xl font-bold text-white text-center flex items-center justify-center">
            <User className="w-8 h-8 mr-3" />
            ✅ Thank You! RETURN iPAD TO ESTIMATOR
          </h3>
          <p className="text-center text-orange-100 mt-2">Estimator will now complete the technical details</p>
        </div>

        <div className="mt-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={jobData.sameAsCustomerAddress}
              onChange={(e) => handleSameAddressChange(e.target.checked)}
              className="mr-3 w-5 h-5"
            />
            <span className="text-sm font-medium text-gray-900">
              Project address same as customer address
            </span>
          </label>
        </div>
        {!jobData.sameAsCustomerAddress && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              <MapPin className="inline w-4 h-4 mr-1" />
              Project Address (if different)
            </label>
            <AddressAutocomplete
              value={jobData.projectAddress}
              onChange={(address) => setJobData((prev) => ({ ...prev, projectAddress: address }))}
              placeholder="Start typing project address..."
              className="w-full p-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium bg-white"
              googlePlacesLoaded={googlePlacesLoaded}
            />
          </div>
        )}
      </div>

      </div>
      </div>

      {/* Project Information */}
      <div className="mb-8 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border border-amber-200 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Building className="w-4 h-4 text-white" />
            </div>
            Project Information
          </h2>
        </div>
        <div className="p-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Customer Budget
            </label>
            <input
              type="number"
              value={jobData.projectValue}
              onChange={(e) => setJobData((prev) => ({
                ...prev,
                projectValue: parseFloat(e.target.value) || 0,
              }))}
              className="w-full p-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-bold bg-white"
              placeholder="$0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              "Pain in the Ass" Charge
            </label>
            <input
              type="number"
              value={jobData.painInTheAssCharge}
              onChange={(e) => setJobData((prev) => ({
                ...prev,
                painInTheAssCharge: parseFloat(e.target.value) || 0,
              }))}
              className="w-full p-3 border-2 border-orange-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 font-bold bg-white"
              placeholder="$0"
            />
            <p className="text-xs text-gray-600 mt-1">For jobs with unusual difficulty or complexity</p>
          </div>
        </div>
        <div className="grid md:grid-cols-1 gap-4 mt-4">
          <div className="p-4 bg-white rounded-lg border-2 border-blue-600">
            <p className="text-sm font-bold text-gray-900 mb-2">
              {jobData.cityCode || "Location Not Set"}
            </p>
            {jobData.cityCode ? (
              <div className="text-sm text-gray-800 space-y-1">
                <p><strong>Live Load:</strong> {jobData.liveLoad} psf</p>
                <p><strong>Snow Load:</strong> {jobData.snowLoad} psf</p>
                <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-300">
                  Based on IRC 2021 requirements for your region. Verify with local building department for exact requirements.
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-600">
                Set GPS location to see building code requirements
              </p>
            )}
          </div>
        </div>
      </div>

        </div>
      </div>

      {/* Estimator-Only: Customer/Project Grade */}
      <div className="mb-8 bg-gradient-to-br from-slate-100 to-gray-100 rounded-xl border border-slate-300 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-600 to-gray-700 px-5 py-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            Estimator Only - Project Assessment
          </h2>
        </div>
        <div className="p-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Customer/Project Grade (Estimator Only)
            </label>
            <select
              value={jobData.customerGrade}
              onChange={(e) => setJobData((prev) => ({ ...prev, customerGrade: e.target.value }))}
              className="w-full p-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium bg-white"
            >
              <option value="">Select grade...</option>
              <option value="A - High Priority">A - High Priority</option>
              <option value="B - Good Lead">B - Good Lead</option>
              <option value="C - Standard">C - Standard</option>
              <option value="D - Price Shopping">D - Price Shopping</option>
              <option value="F - Not Interested">F - Not Interested</option>
            </select>
          </div>
        </div>
      </div>

        </div>
      </div>

      {/* Job-Specific Questions */}
      {jobData.jobTypes.map((jobType) => {
        const questions = getJobQuestions(jobType);
        const groupedQuestions = groupQuestionsByCategory(questions);
        const isNewBuild = jobType.includes("New Build");

        return (
          <div key={jobType} className="mb-8 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Ruler className="w-4 h-4 text-white" />
                </div>
                {jobType}
              </h2>
            </div>
            <div className="p-6">
            {Object.entries(groupedQuestions).map(([category, categoryQuestions]) => (
              <div key={category} className="mb-6">
                {/* General Questions (always shown first) */}
                {categoryQuestions.general.length > 0 && (
                  <div className="mb-4">
                    <button
                      onClick={() => toggleSection(`${jobType}_${category}_general`)}
                      className="w-full flex items-center justify-between p-3 bg-white rounded-lg border-2 border-gray-200 hover:bg-gray-50 mb-4"
                    >
                      <h3 className="font-semibold text-gray-800">{category}</h3>
                      {expandedSections[`${jobType}_${category}_general`] ? (
                        <ChevronUp className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                    {expandedSections[`${jobType}_${category}_general`] && (
                      <div className="space-y-4 ml-4">
                        {(() => {
                          // For non-structure questions, filter normally
                          const nonStructureQuestions = categoryQuestions.general.filter((q) => !q.perStructure && shouldShowQuestion(q, jobType));
                          // For per-structure questions, only apply non-dependency filters here
                          // Dependency filtering happens per-structure in the loop below
                          const perStructureQuestions = categoryQuestions.general.filter((q) => {
                            if (!q.perStructure) return false;
                            // Filter by permit requirement only - dependencies checked per-structure
                            if (q.permitOnly && !jobData.permitRequired) return false;
                            return true;
                          });

                          // Get number of structures (default to 1)
                          const baseCategory = jobType.split(" - ")[0];
                          const numStructuresKey = `${jobType}_number_of_structures`;
                          const numStructures = parseInt(jobData.jobSpecificAnswers[numStructuresKey]) || 1;

                          let questionCounter = 0;

                          return (
                            <>
                              {/* Non-structure questions first */}
                              {nonStructureQuestions.map((question) => {
                                questionCounter++;
                                return (
                                  <div key={question.id} className="bg-white p-4 rounded-lg border border-gray-200">
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                      <span className="text-gray-500 mr-2">#{questionCounter}</span>
                                      {question.question}
                                      {question.required && <span className="text-red-500 ml-1">*</span>}
                                    </label>
                                    {renderQuestion(question, jobType)}
                                  </div>
                                );
                              })}

                              {/* Per-structure questions - repeat for each structure */}
                              {perStructureQuestions.length > 0 && Array.from({ length: numStructures }, (_, structureIndex) => {
                                const structureNum = structureIndex + 1;
                                // Filter questions that should show for this specific structure (accounting for dependencies)
                                const visibleStructureQuestions = perStructureQuestions.filter(q => shouldShowQuestion(q, jobType, structureNum));
                                if (visibleStructureQuestions.length === 0) return null;
                                return (
                                  <div key={`structure_${structureNum}`} className="mt-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                                    <h4 className="text-lg font-bold text-blue-800 mb-4 flex items-center">
                                      <Building className="w-5 h-5 mr-2" />
                                      Structure {structureNum} {numStructures > 1 ? `of ${numStructures}` : ''}
                                    </h4>
                                    <div className="space-y-4">
                                      {visibleStructureQuestions.map((question) => {
                                        questionCounter++;
                                        return (
                                          <div key={`${question.id}_structure_${structureNum}`} className="bg-white p-4 rounded-lg border border-blue-200">
                                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                              <span className="text-gray-500 mr-2">#{questionCounter}</span>
                                              {question.question}
                                              {question.required && <span className="text-red-500 ml-1">*</span>}
                                            </label>
                                            {renderQuestion(question, jobType, structureNum)}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
                {/* Current Condition Assessment (only for non-new builds) */}
                {!isNewBuild && categoryQuestions.current.length > 0 && (
                  <div className="mb-4">
                    <button
                      onClick={() => toggleSection(`${jobType}_${category}_current`)}
                      className="w-full flex items-center justify-between p-3 bg-blue-50 rounded-lg border-2 border-blue-300 hover:bg-blue-100 mb-4"
                    >
                      <h3 className="font-semibold text-blue-800 flex items-center">
                        <ClipboardList className="w-4 h-4 mr-2" />
                        Current Condition Assessment - {category}
                      </h3>
                      {expandedSections[`${jobType}_${category}_current`] ? (
                        <ChevronUp className="w-5 h-5 text-blue-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-blue-600" />
                      )}
                    </button>
                    {expandedSections[`${jobType}_${category}_current`] && (
                      <div className="space-y-4 ml-4">
                        <div className="p-3 bg-blue-100 rounded-lg border-l-4 border-blue-500 mb-4">
                          <p className="text-blue-800 text-sm font-medium">
                            📋 <strong>Document existing conditions:</strong> Record current materials, measurements, condition, and any issues observed.
                          </p>
                        </div>
                        {categoryQuestions.current
                          .filter((q) => shouldShowQuestion(q, jobType))
                          .map((question, questionIndex) => (
                            <div key={question.id} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                              <label className="block text-sm font-medium text-blue-900 mb-2">
                                <span className="text-blue-500 mr-2">#{questionIndex + 1}</span>
                                {question.question}
                                {question.required && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              {renderQuestion(question, jobType)}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
                {/* Recommended Repairs/Changes (only for non-new builds) */}
                {!isNewBuild && categoryQuestions.recommended.length > 0 && (
                  <div className="mb-4">
                    <button
                      onClick={() => toggleSection(`${jobType}_${category}_recommended`)}
                      className="w-full flex items-center justify-between p-3 bg-green-50 rounded-lg border-2 border-green-300 hover:bg-green-100 mb-4"
                    >
                      <h3 className="font-semibold text-green-800 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Recommended Repairs & Changes - {category}
                      </h3>
                      {expandedSections[`${jobType}_${category}_recommended`] ? (
                        <ChevronUp className="w-5 h-5 text-green-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-green-600" />
                      )}
                    </button>
                    {expandedSections[`${jobType}_${category}_recommended`] && (
                      <div className="space-y-4 ml-4">
                        <div className="p-3 bg-green-100 rounded-lg border-l-4 border-green-500 mb-4">
                          <p className="text-green-800 text-sm font-medium">
                            ✅ <strong>Recommend improvements:</strong> Suggest material upgrades, repairs needed, and timeline for completion.
                          </p>
                        </div>
                        {categoryQuestions.recommended
                          .filter((q) => shouldShowQuestion(q, jobType))
                          .map((question, questionIndex) => (
                            <div key={question.id} className="bg-green-50 p-4 rounded-lg border border-green-200">
                              <label className="block text-sm font-medium text-green-900 mb-2">
                                <span className="text-green-600 mr-2">#{questionIndex + 1}</span>
                                {question.question}
                                {question.required && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              {renderQuestion(question, jobType)}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            </div>
          </div>
        );
      })}

      {/* Assessment Summary (for non-new builds) */}
      <AssessmentSummary
        jobTypes={jobData.jobTypes}
        jobSpecificAnswers={jobData.jobSpecificAnswers}
      />

      {/* File Uploads */}
      <div className="mb-8 p-6 bg-indigo-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
          <Camera className="w-5 h-5 mr-2" />
          Photos & Documents
        </h2>
        <div className="mb-4">
          <label className="block w-full p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
              <span className="text-gray-600 font-medium">Click to upload photos and documents</span>
              <p className="text-sm text-gray-500 mt-1">Support for images, PDFs, and documents</p>
            </div>
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              className="hidden"
            />
          </label>
        </div>
        {uploadedFiles.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-800">Uploaded Files:</h3>
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Add notes..."
                    value={file.notes}
                    onChange={(e) => updateFileNotes(index, e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  />
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes Sections */}
      <div className="mb-8 bg-gradient-to-br from-cyan-50 to-sky-50 rounded-xl border border-cyan-200 overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-600 to-sky-600 px-5 py-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <NotebookPen className="w-4 h-4 text-white" />
            </div>
            Notes & Observations
          </h2>
        </div>
        <div className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              General Notes
            </label>
            <textarea
              value={jobData.generalNotes}
              onChange={(e) => setJobData((prev) => ({ ...prev, generalNotes: e.target.value }))}
              className="w-full p-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              rows={4}
              placeholder="Customer preferences, site conditions, special requirements..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Measurement Notes
            </label>
            <textarea
              value={jobData.measurementNotes}
              onChange={(e) => setJobData((prev) => ({ ...prev, measurementNotes: e.target.value }))}
              className="w-full p-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              rows={4}
              placeholder="Measurement details, obstacles, access notes..."
            />
          </div>
        </div>
        </div>
      </div>

      {/* Estimator Follow-up Notes */}
      <div className="mb-8 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl border border-teal-200 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            Estimator Follow-up Notes
          </h2>
        </div>
        <div className="p-6">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Notes for Next Appointment / Follow-up
          </label>
          <textarea
            value={jobData.estimatorNotes}
            onChange={(e) => setJobData((prev) => ({ ...prev, estimatorNotes: e.target.value }))}
            className="w-full p-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            rows={4}
            placeholder="How did the estimate go? Follow-up needed? Customer concerns? Next steps..."
          />
        </div>
        
        <div className="mt-4 p-3 bg-blue-100 rounded-lg border-l-4 border-blue-500">
          <p className="text-blue-800 text-sm font-medium">
            💡 <strong>Use this for:</strong> Customer feedback, concerns raised, follow-up timing, competition mentioned, decision timeline, special considerations for next visit.
          </p>
        </div>
        </div>
      </div>

      {/* Pricing Summary */}
      <PricingSummary
        jobTypes={jobData.jobTypes}
        jobSpecificAnswers={jobData.jobSpecificAnswers}
        permitRequired={jobData.permitRequired}
        painInTheAssCharge={jobData.painInTheAssCharge}
        assignedCrew={jobData.assignedCrew}
        onPermitRequiredChange={(required) => setJobData((prev) => ({ ...prev, permitRequired: required }))}
        onPainInTheAssChargeChange={(charge) => setJobData((prev) => ({ ...prev, painInTheAssCharge: charge }))}
      />

      {/* Span Charts & Tools */}
      <div className="mb-8 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            Reference Tools
          </h2>
        </div>
        <div className="p-6">
        <div className="mb-4 p-3 bg-blue-100 rounded-lg border-l-4 border-blue-500">
          <p className="text-blue-800 text-sm font-medium">
            <strong>Joist Spans:</strong> Distance joists can span between beams
            <br />
            <strong>Beam Spans:</strong> Distance beams can span between columns/foundations
          </p>
        </div>
        <div className="flex flex-wrap gap-4 mb-4">
          <button
            onClick={() => setShowSpanCharts(!showSpanCharts)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex items-center"
          >
            <BarChart className="w-4 h-4 mr-2" />
            {showSpanCharts ? "Hide" : "Show"} Spans & Cantilevers
          </button>

          <button
            onClick={() => setShowReferenceCharts(!showReferenceCharts)}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium flex items-center"
          >
            <FileText className="w-4 h-4 mr-2" />
            {showReferenceCharts ? "Hide" : "Show"} Reference Charts
          </button>

          <button
            onClick={() => setShowCalculations(!showCalculations)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium flex items-center"
          >
            <Calculator className="w-4 h-4 mr-2" />
            {showCalculations ? "Hide" : "Show"} Calculations
          </button>

          <button
            onClick={() => setShowDecoratorsColors(!showDecoratorsColors)}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 font-medium flex items-center"
          >
            <Layers className="w-4 h-4 mr-2" />
            {showDecoratorsColors ? "Hide" : "Show"} Deckorators Colors
          </button>
        </div>
        {showSpanCharts && (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-gray-800 mb-4 text-lg flex items-center">
                <Ruler className="w-5 h-5 mr-2" />
                Joist Span Charts
              </h3>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {COLORADO_SPAN_CHARTS.map((chart) => (
                  <SpanChart key={chart.lumber} lumber={chart.lumber} />
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-bold text-gray-800 mb-4 text-lg flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Beam Span Charts
              </h3>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {COLORADO_BEAM_SPANS.map((beam) => (
                  <BeamSpanChart key={beam.beam} beam={beam.beam} />
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-4 text-lg flex items-center">
                <Calculator className="w-5 h-5 mr-2" />
                Cantilever Span Charts
              </h3>
              <div className="mb-4 p-3 bg-purple-100 rounded-lg border-l-4 border-purple-500">
                <p className="text-purple-800 text-sm font-medium">
                  <strong>Cantilevers:</strong> Deck joists extending beyond the last beam support. Maximum safe distances shown below.
                  <br />
                  <strong>⚠️ Extended Cantilevers (8+ ft):</strong> Require special design considerations and may need upgraded support systems.
                  <br />
                  <strong>Important:</strong> Cannot cantilever columns - joists only beyond beams.
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {COLORADO_CANTILEVER_SPANS.map((cantilever) => (
                  <CantileverChart key={cantilever.lumber} lumber={cantilever.lumber} />
                ))}
              </div>
            </div>
          </div>
        )}
        {showReferenceCharts && (
          <div className="space-y-6 mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <PaintCoverageChart />
              <FastenerGuideChart />
              <WireGaugeChart />
              <InsulationChart />
              <RetainingWallChart />
              <LumberGradeChart />
            </div>
          </div>
        )}
        {showCalculations && (
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="font-bold text-gray-800 mb-3">Current Calculations</h3>
            <pre className="text-sm text-gray-600 bg-gray-50 p-3 rounded overflow-auto max-h-96">
              {JSON.stringify(jobData.calculations, null, 2)}
            </pre>
          </div>
        )}
        {showDecoratorsColors && (
          <div className="mt-6 bg-white p-6 rounded-lg border-2 border-orange-300">
            <h3 className="font-bold text-gray-800 mb-6 text-xl flex items-center">
              <Layers className="w-6 h-6 mr-2 text-orange-600" />
              Deckorators Decking Color Options
            </h3>

            <div className="space-y-6">
              {/* Voyage Decking */}
              <div>
                <h4 className="font-bold text-gray-700 mb-3 text-lg border-b-2 border-orange-200 pb-2">Voyage Decking (Surestone Technology)</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {['Costa', 'Sierra', 'Khaya', 'Tundra', 'Sedona', 'Mesa'].map(color => (
                    <button
                      key={color}
                      onClick={() => setJobData(prev => ({ ...prev, paintStainColors: color }))}
                      className="p-3 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-lg hover:border-orange-500 hover:shadow-md transition text-sm font-bold text-gray-800"
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summit Decking */}
              <div>
                <h4 className="font-bold text-gray-700 mb-3 text-lg border-b-2 border-blue-200 pb-2">Summit Decking</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {['Glacier', 'Boulder', 'Cliffside'].map(color => (
                    <button
                      key={color}
                      onClick={() => setJobData(prev => ({ ...prev, paintStainColors: color }))}
                      className="p-3 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:shadow-md transition text-sm font-bold text-gray-800"
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Venture Decking */}
              <div>
                <h4 className="font-bold text-gray-700 mb-3 text-lg border-b-2 border-teal-200 pb-2">Venture Decking</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {['Saltwater', 'Sandbar', 'Shoreline'].map(color => (
                    <button
                      key={color}
                      onClick={() => setJobData(prev => ({ ...prev, paintStainColors: color }))}
                      className="p-3 bg-gradient-to-br from-teal-50 to-emerald-50 border-2 border-teal-200 rounded-lg hover:border-teal-500 hover:shadow-md transition text-sm font-bold text-gray-800"
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Altitude Decking */}
              <div>
                <h4 className="font-bold text-gray-700 mb-3 text-lg border-b-2 border-green-200 pb-2">Altitude Decking</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {['Sequoia', 'Highland', 'Trailstone'].map(color => (
                    <button
                      key={color}
                      onClick={() => setJobData(prev => ({ ...prev, paintStainColors: color }))}
                      className="p-3 bg-gradient-to-br from-green-50 to-lime-50 border-2 border-green-200 rounded-lg hover:border-green-500 hover:shadow-md transition text-sm font-bold text-gray-800"
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vista Decking */}
              <div>
                <h4 className="font-bold text-gray-700 mb-3 text-lg border-b-2 border-purple-200 pb-2">Vista Decking</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {['Driftwood', 'Ironwood', 'Silverwood', 'Dunewood'].map(color => (
                    <button
                      key={color}
                      onClick={() => setJobData(prev => ({ ...prev, paintStainColors: color }))}
                      className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg hover:border-purple-500 hover:shadow-md transition text-sm font-bold text-gray-800"
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Porch Flooring */}
              <div>
                <h4 className="font-bold text-gray-700 mb-3 text-lg border-b-2 border-amber-200 pb-2">Porch Flooring</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {['Kettle', 'Chicory'].map(color => (
                    <button
                      key={color}
                      onClick={() => setJobData(prev => ({ ...prev, paintStainColors: color }))}
                      className="p-3 bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-lg hover:border-amber-500 hover:shadow-md transition text-sm font-bold text-gray-800"
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                <p className="text-blue-800 text-sm">
                  <strong>Note:</strong> Click any color to automatically fill it into the customer's paint/stain color preference. These colors will auto-populate in the estimate.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Smart Calculation Warnings */}
      {(() => {
        const warnings = getCalculationWarnings();
        if (warnings.length === 0) return null;

        return (
          <div className="mb-8 p-6 bg-white rounded-lg border-2 border-orange-300 shadow-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center">
              <AlertTriangle className="w-6 h-6 mr-2 text-orange-600" />
              Smart Calculation Warnings
            </h2>
            <div className="space-y-3">
              {warnings.map((warning, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border-l-4 ${
                    warning.type === 'error'
                      ? 'bg-red-50 border-red-500'
                      : warning.type === 'warning'
                      ? 'bg-yellow-50 border-yellow-500'
                      : 'bg-blue-50 border-blue-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        warning.type === 'error'
                          ? 'text-red-600'
                          : warning.type === 'warning'
                          ? 'text-yellow-600'
                          : 'text-blue-600'
                      }`}
                    />
                    <div>
                      <div
                        className={`font-bold text-sm ${
                          warning.type === 'error'
                            ? 'text-red-800'
                            : warning.type === 'warning'
                            ? 'text-yellow-800'
                            : 'text-blue-800'
                        }`}
                      >
                        {warning.type === 'error' ? 'ERROR' : warning.type === 'warning' ? 'WARNING' : 'INFO'}
                      </div>
                      <p
                        className={`text-sm mt-1 ${
                          warning.type === 'error'
                            ? 'text-red-700'
                            : warning.type === 'warning'
                            ? 'text-yellow-700'
                            : 'text-blue-700'
                        }`}
                      >
                        {warning.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Cost Estimate Section */}
      {costEstimate && (
        <div className="mb-8 p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-300 shadow-md">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
            <Calculator className="w-6 h-6 mr-2 text-green-600" />
            Cost Estimate Summary
          </h2>

          {/* Total Estimate - Highlighted */}
          <div className="mb-6 p-6 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg shadow-lg">
            <div className="flex items-center justify-between text-white">
              <span className="text-xl font-bold">Total Project Estimate:</span>
              <span className="text-4xl font-bold">${costEstimate.totalEstimate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Left Column - Main Costs */}
            <div className="bg-white p-5 rounded-lg border-2 border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">Cost Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Materials (Base):</span>
                  <span className="font-bold text-gray-900">${costEstimate.materials.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Materials with Markup (15%):</span>
                  <span className="font-bold text-gray-900">${costEstimate.materialsWithMarkup.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Labor:</span>
                  <span className="font-bold text-gray-900">${costEstimate.labor.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="font-bold text-gray-900">${costEstimate.subtotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Right Column - Additional Costs */}
            <div className="bg-white p-5 rounded-lg border-2 border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">Additional Costs</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Overhead (10%):</span>
                  <span className="font-bold text-gray-900">${costEstimate.overhead.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Profit (20%):</span>
                  <span className="font-bold text-gray-900">${costEstimate.profit.toLocaleString()}</span>
                </div>
                {costEstimate.permitFee > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Permit Fee:</span>
                    <span className="font-bold text-gray-900">${costEstimate.permitFee.toLocaleString()}</span>
                  </div>
                )}
                {costEstimate.painInTheAss > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">"Pain in the Ass" Charge:</span>
                    <span className="font-bold text-orange-600">${costEstimate.painInTheAss.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Itemized Materials */}
          {costEstimate.itemizedMaterials.length > 0 && (
            <div className="mb-6 bg-white p-5 rounded-lg border-2 border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">Itemized Materials</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-2 px-3 font-bold text-gray-700">Material</th>
                      <th className="text-right py-2 px-3 font-bold text-gray-700">Quantity</th>
                      <th className="text-right py-2 px-3 font-bold text-gray-700">Unit Price</th>
                      <th className="text-right py-2 px-3 font-bold text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costEstimate.itemizedMaterials.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 text-gray-800">{item.item}</td>
                        <td className="text-right py-2 px-3 text-gray-700">{item.quantity.toFixed(1)} {item.unit}</td>
                        <td className="text-right py-2 px-3 text-gray-700">${item.unitPrice.toFixed(2)}</td>
                        <td className="text-right py-2 px-3 font-bold text-gray-900">${item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Itemized Labor */}
          {costEstimate.itemizedLabor.length > 0 && (
            <div className="bg-white p-5 rounded-lg border-2 border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">Itemized Labor</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-2 px-3 font-bold text-gray-700">Task</th>
                      <th className="text-right py-2 px-3 font-bold text-gray-700">Units</th>
                      <th className="text-right py-2 px-3 font-bold text-gray-700">Rate</th>
                      <th className="text-right py-2 px-3 font-bold text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costEstimate.itemizedLabor.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 text-gray-800">{item.task}</td>
                        <td className="text-right py-2 px-3 text-gray-700">{(item.units ?? 0).toFixed(1)}</td>
                        <td className="text-right py-2 px-3 text-gray-700">${(item.rate ?? 0).toFixed(2)}/unit</td>
                        <td className="text-right py-2 px-3 font-bold text-gray-900">${(item.total ?? 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
            <p className="text-xs text-yellow-800">
              <strong>Note:</strong> This estimate is based on current material and labor pricing. Final costs may vary based on actual site conditions, material availability, and project complexity. Prices include 10% waste factor on materials, 15% material markup, 10% overhead, and 20% profit margin.
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mb-8 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 shadow-xl">
        <h3 className="text-white text-lg font-semibold mb-4 text-center">Quick Actions</h3>
        <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={saveJobToFirebase}
          disabled={isSaving || validationErrors.length > 0}
          className={`px-5 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all duration-200 shadow-lg ${
            isSaving || validationErrors.length > 0
              ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:shadow-green-500/30 hover:-translate-y-0.5'
          }`}
        >
          <Save className="w-5 h-5" />
          {isSaving ? "Saving..." : "Save to Cloud"}
        </button>
        <button
          onClick={() => {
            try {
              const draftData = {
                jobData,
                uploadedFiles,
                drawings,
                savedAt: new Date().toISOString()
              };
              localStorage.setItem('estimator_draft', JSON.stringify(draftData));
              setLastSaved(new Date());
              alert('Draft saved successfully!');
            } catch (error) {
              alert('Failed to save draft. Please try again.');
            }
          }}
          className="px-5 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 font-semibold flex items-center gap-2 transition-all duration-200 shadow-lg hover:-translate-y-0.5"
        >
          <Save className="w-5 h-5" />
          Save Draft
        </button>
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to clear the saved draft? This cannot be undone.')) {
              localStorage.removeItem('estimator_draft');
              setLastSaved(null);
              alert('Draft cleared successfully!');
            }
          }}
          className="px-5 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 font-semibold flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-red-500/30 hover:-translate-y-0.5"
        >
          <FileText className="w-5 h-5" />
          Clear Draft
        </button>
        <button
          onClick={showEstimatePreview}
          className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 font-semibold flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5"
        >
          <FileText className="w-5 h-5" />
          Preview Estimate
        </button>
        <button
          onClick={() => {
            const jobRecord = {
              ...jobData,
              files: uploadedFiles,
              permitRequirements: getPermitRequirements(),
              coloradoCodes: COLORADO_CODES,
              estimatorVersion: "3.0.0",
              exportedAt: new Date().toISOString(),
            };
            emailEstimate(jobRecord);
          }}
          className="px-5 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl hover:from-blue-600 hover:to-cyan-700 font-semibold flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5"
        >
          <User className="w-5 h-5" />
          Email Estimate
        </button>
        <button
          onClick={exportMaterialsList}
          className="px-5 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 font-semibold flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-purple-500/30 hover:-translate-y-0.5"
        >
          <Download className="w-5 h-5" />
          Export Materials
        </button>
        <button
          onClick={() => setShowDrawingModal(true)}
          className="px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl hover:from-orange-600 hover:to-amber-700 font-semibold flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5"
        >
          <Layers className="w-5 h-5" />
          2D Drawing
        </button>
        </div>
      </div>

      {/* Drawing Gallery */}
      <DrawingGallery
        drawings={drawings}
        onEdit={(drawing) => {
          // TODO: Open modal with existing drawing for editing
          console.log('Edit drawing:', drawing);
          setShowDrawingModal(true);
        }}
        onDelete={async (id) => {
          // Remove from state
          setDrawings(drawings.filter((d) => d.id !== id));
          // TODO: Also delete from Firebase Storage
        }}
      />

      {/* Mobile Access & Integration Information */}
      <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border-2 border-blue-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
          <Calculator className="w-5 h-5 mr-2" />
          Mobile Access & Integrations
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="font-bold text-blue-800 mb-2 flex items-center">
              📱 iPad Access
            </h3>
            <p className="text-sm text-gray-700 mb-2">
              <strong>For iPad field use:</strong>
            </p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Save as PWA (Add to Home Screen)</li>
              <li>• Works offline after initial load</li>
              <li>• Responsive design for all screen sizes</li>
              <li>• GPS location capture enabled</li>
              <li>• Camera integration for photos</li>
            </ul>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="font-bold text-green-800 mb-2 flex items-center">
              ☁️ Cloud Backup
            </h3>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Real Firestore saves:</strong>
            </p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Auto-backup to Firebase Cloud</li>
              <li>• Instant data persistence</li>
              <li>• Office access via Firebase Console</li>
              <li>• Never lose an estimate again</li>
              <li>• Works offline, syncs when online</li>
            </ul>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="font-bold text-blue-800 mb-2 flex items-center">
              📧 Email Export
            </h3>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Instant estimate sharing:</strong>
            </p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Email complete estimates</li>
              <li>• Include all measurements & notes</li>
              <li>• Materials lists attached</li>
              <li>• Customer & project details</li>
              <li>• Works on iPad email app</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 p-3 bg-green-100 rounded-lg border-l-4 border-green-500">
          <p className="text-green-800 text-sm font-medium">
            ✅ <strong>Enhanced Estimator Features:</strong> App now includes separate sections for current condition assessment and repair recommendations for all job types (except new builds). Cloud integration active - estimates save to Firebase and email instantly.
          </p>
        </div>
        <div className="mt-2 p-3 bg-blue-100 rounded-lg border-l-4 border-blue-500">
          <p className="text-blue-800 text-sm font-medium">
            🔗 <strong>Firebase Console Access:</strong>{" "}
            <a
              href="https://console.firebase.google.com/project/pocket-estimator-5c6a6/firestore"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              https://console.firebase.google.com/project/pocket-estimator-5c6a6/firestore
            </a>
          </p>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <FileText className="w-6 h-6 mr-2" />
                Estimate Preview
              </h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
              <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 bg-white p-6 rounded-lg border border-gray-200 shadow-inner">
                {previewContent}
              </pre>
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const jobRecord = {
                    ...jobData,
                    files: uploadedFiles,
                    permitRequirements: getPermitRequirements(),
                    coloradoCodes: COLORADO_CODES,
                    estimatorVersion: "3.0.0",
                    exportedAt: new Date().toISOString(),
                  };
                  emailEstimate(jobRecord);
                  setShowPreview(false);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex items-center"
              >
                <User className="w-5 h-5 mr-2" />
                Email This Estimate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawing Modal */}
      <DrawingModal
        isOpen={showDrawingModal}
        onClose={() => setShowDrawingModal(false)}
        jobData={jobData}
        uploadedFiles={uploadedFiles}
        onSaveDrawing={(drawing) => {
          setDrawings([...drawings, drawing]);
          setShowDrawingModal(false);
        }}
      />
    </div>
  </div>
);

// ---------------------------
// REFERENCE CHARTS & DATA - Added from "construction estimating app features"
// ---------------------------

// Additional Colorado-specific reference data

// Colorado Altitude Effects
const ALTITUDE_EFFECTS = {
"Concrete": { effect: "5.5% air entrainment required", reason: "Freeze-thaw protection" },
"Paint Drying": { effect: "Faster drying time", reason: "Lower humidity, UV exposure" },
"Wood Moisture": { effect: "Lower moisture content", reason: "Dry climate considerations" }
};

// Railing Code Requirements
const RAILING_CODES = {
"Height": { residential: "36\" minimum", commercial: "42\" minimum", highDeck: "42\" over 30\" high" },
"Spacing": { balusters: "4\" maximum gap", infill: "No sphere >4\" can pass through" },
"Load": { top: "200 lbs concentrated", infill: "50 lbs/sq ft", structural: "Professional design required" }
};

// Stair Code Chart
const STAIR_CODES = {
"Rise/Run": { maxRise: "7.75\"", minRun: "10\"", variation: "3/8\" maximum variation" },
"Handrails": { height: "34\"-38\" above nosing", returns: "Returned to wall or post" },
"Landings": { width: "Min 36\" deep", door: "Min door width" }
};

// Safety Guidelines
const SAFETY_GUIDELINES = {
"Fall Protection": { requirement: "6 feet and above", type: "Harness and lanyard system" },
"Ladder Safety": { angle: "4:1 ratio (75°)", extend: "3 feet above roof", inspection: "Daily inspection required" },
"Tool Safety": { power: "GFCI protection required", guards: "Never remove safety guards", PPE: "Safety glasses, hearing protection" }
};

const MaterialsList = ({ jobType }: { jobType: string }) => {
const materials = jobData.calculations[`${jobType}_materials`];
if (!materials) return <div>Complete measurements to generate materials list</div>;

return (
<div className="bg-green-50 p-4 rounded-lg border">
<h4 className="font-bold text-gray-800 mb-4 flex items-center">
<ClipboardList className="w-5 h-5 mr-2" />
Materials List - {jobType}
</h4>
{Object.entries(materials).map(([category, items]) => (
<div key={category} className="mb-4">
<h5 className="font-semibold text-gray-700 mb-2 capitalize">{category.replace(/([A-Z])/g, " $1").trim()}</h5>
<div className="ml-4 space-y-1 text-sm">
  {typeof items === "object" && items !== null ? (
    Object.entries(items as Record<string, any>).map(([key, value]) => (
      <div key={key} className="flex justify-between">
        <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}:</span>
        <span className="font-medium">{typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
      </div>
    ))
  ) : (
    <div>{String(items)}</div>
  )}
</div>
</div>
))}
<button onClick={exportMaterialsList} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-bold flex items-center">
<Download className="w-4 h-4 mr-2" />
Export Materials List
</button>
</div>
);
};
}
