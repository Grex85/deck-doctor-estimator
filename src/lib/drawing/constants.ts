// Canvas dimensions
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const CANVAS_MARGIN = 50;

// Mobile canvas dimensions
export const MOBILE_CANVAS_HEIGHT = 400;

// Export resolutions
export const EXPORT_PIXEL_RATIO = 2; // 2x resolution for high quality
export const THUMBNAIL_PIXEL_RATIO = 0.25; // 0.25x for thumbnails

// Thumbnail dimensions
export const THUMBNAIL_WIDTH = 200;
export const THUMBNAIL_HEIGHT = 150;

// Grid settings
export const GRID_SIZE = 20; // pixels
export const GRID_COLOR = '#e0e0e0';
export const GRID_LINE_WIDTH = 1;

// Drawing colors
export const DEFAULT_COLORS = [
  '#000000', // Black
  '#FF0000', // Red
  '#0000FF', // Blue
  '#00FF00', // Green
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FFA500', // Orange
  '#800080', // Purple
  '#FFFFFF', // White
];

export const DEFAULT_STROKE_COLOR = '#FF0000'; // Red
export const DEFAULT_FILL_COLOR = '#FFFFFF'; // White
export const DEFAULT_TEXT_COLOR = '#000000'; // Black

// Stroke widths
export const MIN_STROKE_WIDTH = 1;
export const MAX_STROKE_WIDTH = 20;
export const DEFAULT_STROKE_WIDTH = 3;

// Component colors (for auto-generated diagrams)
export const COMPONENT_COLORS = {
  ledger: '#8B4513', // Saddle Brown
  beam: '#A0522D', // Sienna
  post: '#654321', // Dark Brown
  joist: '#666666', // Gray
  decking: '#D2691E', // Chocolate
  railing: '#8B0000', // Dark Red
  perimeter: '#000000', // Black
  dimension: '#000000', // Black
  label: '#000000', // Black
};

// Font sizes
export const DEFAULT_FONT_SIZE = 14;
export const DIMENSION_FONT_SIZE = 12;
export const LABEL_FONT_SIZE = 16;

// Builder component sizes (in pixels on canvas)
export const BUILDER_COMPONENT_SIZES = {
  post_4x4: { width: 16, height: 16 },
  post_6x6: { width: 24, height: 24 },
  post_8x8: { width: 32, height: 32 },
  beam_2x10: { width: 8, height: 40 },
  beam_2x12: { width: 8, height: 48 },
  joist_2x6: { width: 6, height: 24 },
  joist_2x8: { width: 6, height: 32 },
  joist_2x10: { width: 6, height: 40 },
};

// Drag and drop types
export const DND_TYPES = {
  POST: 'post',
  BEAM: 'beam',
  JOIST: 'joist',
  RAILING: 'railing',
  STAIRS: 'stairs',
  LEDGER: 'ledger',
  DECKING: 'decking',
};

// Auto-generation scale limits
export const MIN_SCALE = 0.1;
export const MAX_SCALE = 10;

// Zoom settings
export const ZOOM_FACTOR = 1.2;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 3;

// Touch settings
export const TOUCH_TARGET_SIZE = 44; // Minimum 44x44px for touch targets

// Firebase storage paths
export const STORAGE_PATHS = {
  drawings: 'drawings',
  thumbnails: 'thumbnails',
};

// File export settings
export const EXPORT_FORMAT = 'image/png';
export const EXPORT_QUALITY = 0.95; // For JPEG, not used for PNG

// Undo/redo history limit
export const MAX_HISTORY = 50;

// Component palette categories
export const COMPONENT_CATEGORIES = {
  structural: ['post', 'beam', 'joist', 'ledger'],
  finishing: ['decking', 'railing'],
  accessories: ['stairs'],
};

// Material options
export const MATERIAL_OPTIONS = {
  lumber: [
    'Pressure Treated Pine',
    'Cedar',
    'Redwood',
    'Composite',
    'PVC',
    'Engineered (LVL)',
  ],
  sizes: {
    posts: ['4x4', '6x6', '8x8'],
    beams: ['2x6', '2x8', '2x10', '2x12', 'Triple 2x10', 'Triple 2x12', 'LVL'],
    joists: ['2x6', '2x8', '2x10', '2x12'],
  },
};
