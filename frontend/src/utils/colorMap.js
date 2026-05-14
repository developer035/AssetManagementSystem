/**
 * Category → Color mapping for consistent UI rendering.
 * Uses full category names matching the backend detector output.
 */
export const CATEGORY_COLORS = {
  'Properties & Buildings': '#E74C3C',
  'Trees & Green Cover':    '#27AE60',
  'Parks & Open Spaces':    '#2ECC71',
  'Water Bodies':           '#2980B9',
  'Roads & Footpaths':      '#95A5A6',
  'Drains & Sewage':        '#8E44AD',
  'Vehicles & Parking':     '#F39C12',
  'Waste Dumps':            '#D35400',
};

export const CATEGORY_LABELS = {
  'Properties & Buildings': '🏢 Buildings',
  'Trees & Green Cover':    '🌳 Trees',
  'Parks & Open Spaces':    '🌿 Parks',
  'Water Bodies':           '💧 Water',
  'Roads & Footpaths':      '🛣️ Roads',
  'Drains & Sewage':        '🚿 Drains',
  'Vehicles & Parking':     '🚗 Vehicles',
  'Waste Dumps':            '🗑️ Waste',
};

export const CATEGORY_ICONS = {
  'Properties & Buildings': '🏢',
  'Trees & Green Cover':    '🌳',
  'Parks & Open Spaces':    '🌿',
  'Water Bodies':           '💧',
  'Roads & Footpaths':      '🛣️',
  'Drains & Sewage':        '🚿',
  'Vehicles & Parking':     '🚗',
  'Waste Dumps':            '🗑️',
};

/**
 * Get hex color with optional alpha (for canvas fills).
 */
export function getCategoryColor(category, alpha = 1) {
  const hex = CATEGORY_COLORS[category] || '#FFFFFF';
  if (alpha >= 1) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Get all unique categories from detections array.
 */
export function getUniqueCategories(detections) {
  return [...new Set(detections.map(d => d.category))].sort();
}
