// Pricing Database for Deck Doctor Estimator
// All prices in USD

export interface MaterialPrice {
  name: string;
  unit: string;
  price: number;
  category: string;
}

export interface LaborRate {
  name: string;
  ratePerHour: number;
  ratePerUnit?: number;
  unit?: string;
}

// Material Pricing Database
export const MATERIAL_PRICES: Record<string, MaterialPrice> = {
  // Decking Materials (per linear foot)
  'Pressure Treated Pine 5/4x6': { name: 'Pressure Treated Pine 5/4x6', unit: 'linear ft', price: 1.85, category: 'Decking' },
  'Cedar 5/4x6': { name: 'Cedar 5/4x6', unit: 'linear ft', price: 3.25, category: 'Decking' },
  'Composite (Trex) 5/4x6': { name: 'Composite (Trex) 5/4x6', unit: 'linear ft', price: 4.50, category: 'Decking' },
  'Composite (Deckorators) 5/4x6': { name: 'Composite (Deckorators) 5/4x6', unit: 'linear ft', price: 4.25, category: 'Decking' },
  'PVC Decking 5/4x6': { name: 'PVC Decking 5/4x6', unit: 'linear ft', price: 5.00, category: 'Decking' },

  // Framing Lumber (per linear foot)
  '2x6 Pressure Treated': { name: '2x6 Pressure Treated', unit: 'linear ft', price: 1.25, category: 'Framing' },
  '2x8 Pressure Treated': { name: '2x8 Pressure Treated', unit: 'linear ft', price: 1.75, category: 'Framing' },
  '2x10 Pressure Treated': { name: '2x10 Pressure Treated', unit: 'linear ft', price: 2.25, category: 'Framing' },
  '2x12 Pressure Treated': { name: '2x12 Pressure Treated', unit: 'linear ft', price: 2.75, category: 'Framing' },
  '4x4 Pressure Treated': { name: '4x4 Pressure Treated', unit: 'linear ft', price: 3.50, category: 'Posts' },
  '6x6 Pressure Treated': { name: '6x6 Pressure Treated', unit: 'linear ft', price: 8.50, category: 'Posts' },

  // Beams (per linear foot)
  '2x8 Beam': { name: '2x8 Beam', unit: 'linear ft', price: 1.75, category: 'Beams' },
  '2x10 Beam': { name: '2x10 Beam', unit: 'linear ft', price: 2.25, category: 'Beams' },
  '2x12 Beam': { name: '2x12 Beam', unit: 'linear ft', price: 2.75, category: 'Beams' },
  '4x6 Beam': { name: '4x6 Beam', unit: 'linear ft', price: 6.00, category: 'Beams' },
  '6x6 Beam': { name: '6x6 Beam', unit: 'linear ft', price: 8.50, category: 'Beams' },

  // Hardware (per unit)
  'Deck Screw': { name: 'Deck Screw', unit: 'each', price: 0.05, category: 'Hardware' },
  'Single Joist Hanger': { name: 'Single Joist Hanger', unit: 'each', price: 1.25, category: 'Hardware' },
  'Double Joist Hanger': { name: 'Double Joist Hanger', unit: 'each', price: 2.50, category: 'Hardware' },
  'Joist Hanger Nail': { name: 'Joist Hanger Nail', unit: 'each', price: 0.02, category: 'Hardware' },
  'Galvanized Bolt': { name: 'Galvanized Bolt', unit: 'each', price: 0.75, category: 'Hardware' },
  'Post Base': { name: 'Post Base', unit: 'each', price: 8.50, category: 'Hardware' },
  'Hidden Fastener': { name: 'Hidden Fastener', unit: 'each', price: 0.35, category: 'Hardware' },

  // Concrete (per unit)
  'Concrete Footing': { name: 'Concrete Footing', unit: 'each', price: 45.00, category: 'Concrete' },
  'Concrete (cubic yard)': { name: 'Concrete (cubic yard)', unit: 'cubic yard', price: 150.00, category: 'Concrete' },

  // Railing (per linear foot)
  'Pressure Treated Railing': { name: 'Pressure Treated Railing', unit: 'linear ft', price: 12.00, category: 'Railing' },
  'Cedar Railing': { name: 'Cedar Railing', unit: 'linear ft', price: 18.00, category: 'Railing' },
  'Composite Railing': { name: 'Composite Railing', unit: 'linear ft', price: 25.00, category: 'Railing' },
  'Aluminum Railing': { name: 'Aluminum Railing', unit: 'linear ft', price: 35.00, category: 'Railing' },
  'Cable Railing': { name: 'Cable Railing', unit: 'linear ft', price: 45.00, category: 'Railing' },

  // Stairs (per stair)
  'Stair Stringer': { name: 'Stair Stringer', unit: 'each', price: 25.00, category: 'Stairs' },
  'Stair Tread': { name: 'Stair Tread', unit: 'each', price: 8.50, category: 'Stairs' },
  'Stair Riser': { name: 'Stair Riser', unit: 'each', price: 6.00, category: 'Stairs' },
};

// Labor Rates
export const LABOR_RATES: Record<string, LaborRate> = {
  'General Framing': { name: 'General Framing', ratePerHour: 75.00, ratePerUnit: 8.50, unit: 'sq ft' },
  'Decking Installation': { name: 'Decking Installation', ratePerHour: 75.00, ratePerUnit: 6.00, unit: 'sq ft' },
  'Railing Installation': { name: 'Railing Installation', ratePerHour: 75.00, ratePerUnit: 15.00, unit: 'linear ft' },
  'Stair Construction': { name: 'Stair Construction', ratePerHour: 85.00, ratePerUnit: 125.00, unit: 'stair' },
  'Concrete Work': { name: 'Concrete Work', ratePerHour: 85.00, ratePerUnit: 75.00, unit: 'footing' },
  'Demolition': { name: 'Demolition', ratePerHour: 65.00, ratePerUnit: 5.00, unit: 'sq ft' },
  'Refinishing': { name: 'Refinishing', ratePerHour: 65.00, ratePerUnit: 3.50, unit: 'sq ft' },
  'Pergola Construction': { name: 'Pergola Construction', ratePerHour: 85.00 },
  'Painting/Staining': { name: 'Painting/Staining', ratePerHour: 65.00, ratePerUnit: 2.50, unit: 'sq ft' },
};

// Markup and Overhead
export const PRICING_FACTORS = {
  materialMarkup: 0.15, // 15% markup on materials
  overhead: 0.10, // 10% overhead
  profit: 0.20, // 20% profit margin
  permitFee: 250.00, // Average permit fee
  wasteFactor: 0.10, // 10% waste allowance for materials
};

// Cost Calculation Functions
export interface CostBreakdown {
  materials: number;
  labor: number;
  materialsWithMarkup: number;
  subtotal: number;
  overhead: number;
  profit: number;
  permitFee: number;
  painInTheAss: number;
  totalEstimate: number;
  itemizedMaterials: Array<{
    item: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }>;
  itemizedLabor: Array<{
    task: string;
    hours?: number;
    units?: number;
    rate: number;
    total: number;
  }>;
}

export function calculateMaterialCost(
  item: string,
  quantity: number
): { item: string; quantity: number; unit: string; unitPrice: number; total: number } | null {
  const material = MATERIAL_PRICES[item];
  if (!material) return null;

  const quantityWithWaste = quantity * (1 + PRICING_FACTORS.wasteFactor);
  const total = quantityWithWaste * material.price;

  return {
    item: material.name,
    quantity: Math.ceil(quantityWithWaste * 10) / 10, // Round to 1 decimal
    unit: material.unit,
    unitPrice: material.price,
    total: Math.round(total * 100) / 100, // Round to 2 decimals
  };
}

export function calculateLaborCost(
  task: string,
  units: number
): { task: string; units: number; rate: number; total: number } | null {
  const labor = LABOR_RATES[task];
  if (!labor || !labor.ratePerUnit) return null;

  const total = units * labor.ratePerUnit;

  return {
    task: labor.name,
    units,
    rate: labor.ratePerUnit,
    total: Math.round(total * 100) / 100,
  };
}

export function calculateProjectCost(
  materials: Array<{ item: string; quantity: number }>,
  labor: Array<{ task: string; units: number }>,
  permitRequired: boolean = false,
  painInTheAssCharge: number = 0
): CostBreakdown {
  // Calculate itemized materials
  const itemizedMaterials = materials
    .map(m => calculateMaterialCost(m.item, m.quantity))
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const materialsCost = itemizedMaterials.reduce((sum, item) => sum + item.total, 0);

  // Calculate itemized labor
  const itemizedLabor = labor
    .map(l => calculateLaborCost(l.task, l.units))
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const laborCost = itemizedLabor.reduce((sum, item) => sum + item.total, 0);

  // Apply markup to materials
  const materialsWithMarkup = materialsCost * (1 + PRICING_FACTORS.materialMarkup);

  // Subtotal before overhead and profit
  const subtotal = materialsWithMarkup + laborCost;

  // Calculate overhead and profit
  const overhead = subtotal * PRICING_FACTORS.overhead;
  const profit = subtotal * PRICING_FACTORS.profit;

  // Calculate total
  const permitFee = permitRequired ? PRICING_FACTORS.permitFee : 0;
  const totalEstimate = subtotal + overhead + profit + permitFee + painInTheAssCharge;

  return {
    materials: Math.round(materialsCost * 100) / 100,
    labor: Math.round(laborCost * 100) / 100,
    materialsWithMarkup: Math.round(materialsWithMarkup * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    overhead: Math.round(overhead * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    permitFee,
    painInTheAss: painInTheAssCharge,
    totalEstimate: Math.round(totalEstimate * 100) / 100,
    itemizedMaterials,
    itemizedLabor,
  };
}

// Helper function to get material price by name (fuzzy match)
export function getMaterialPrice(materialName: string): MaterialPrice | null {
  // Direct match
  if (MATERIAL_PRICES[materialName]) {
    return MATERIAL_PRICES[materialName];
  }

  // Fuzzy match (case-insensitive, partial match)
  const normalized = materialName.toLowerCase();
  const match = Object.values(MATERIAL_PRICES).find(m =>
    m.name.toLowerCase().includes(normalized) || normalized.includes(m.name.toLowerCase())
  );

  return match || null;
}

// Helper function to estimate deck project cost from basic measurements
export function estimateDeckCost(params: {
  squareFootage: number;
  deckingMaterial: string;
  joistLinearFeet: number;
  beamLinearFeet: number;
  posts: number;
  railingLinearFeet: number;
  railingMaterial: string;
  stairs: number;
  permitRequired: boolean;
  painInTheAssCharge: number;
}): CostBreakdown {
  const materials: Array<{ item: string; quantity: number }> = [];
  const labor: Array<{ task: string; units: number }> = [];

  // Decking
  if (params.deckingMaterial && params.squareFootage > 0) {
    const deckingKey = `${params.deckingMaterial} 5/4x6`;
    const linearFeet = params.squareFootage * 2.1; // Approx 2.1 linear ft per sq ft
    materials.push({ item: deckingKey, quantity: linearFeet });
    labor.push({ task: 'Decking Installation', units: params.squareFootage });
  }

  // Framing
  if (params.joistLinearFeet > 0) {
    materials.push({ item: '2x8 Pressure Treated', quantity: params.joistLinearFeet });
  }

  if (params.beamLinearFeet > 0) {
    materials.push({ item: '2x10 Beam', quantity: params.beamLinearFeet });
  }

  if (params.posts > 0) {
    materials.push({ item: '6x6 Pressure Treated', quantity: params.posts * 8 }); // 8ft posts
    materials.push({ item: 'Concrete Footing', quantity: params.posts });
    labor.push({ task: 'Concrete Work', units: params.posts });
  }

  if (params.squareFootage > 0) {
    labor.push({ task: 'General Framing', units: params.squareFootage });
  }

  // Railing
  if (params.railingLinearFeet > 0 && params.railingMaterial) {
    const railingKey = `${params.railingMaterial} Railing`;
    materials.push({ item: railingKey, quantity: params.railingLinearFeet });
    labor.push({ task: 'Railing Installation', units: params.railingLinearFeet });
  }

  // Stairs
  if (params.stairs > 0) {
    materials.push({ item: 'Stair Stringer', quantity: params.stairs * 3 }); // 3 stringers per stair
    materials.push({ item: 'Stair Tread', quantity: params.stairs * 4 }); // 4 treads per stair avg
    labor.push({ task: 'Stair Construction', units: params.stairs });
  }

  return calculateProjectCost(materials, labor, params.permitRequired, params.painInTheAssCharge);
}
