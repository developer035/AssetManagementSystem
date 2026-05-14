import axios from 'axios';

const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

function getBackendBaseUrl() {
  if (BASE_URL.startsWith('http://') || BASE_URL.startsWith('https://')) {
    return BASE_URL.replace(/\/api\/?$/, '');
  }

  if (typeof window !== 'undefined') {
    return new URL(BASE_URL.replace(/\/api\/?$/, '') || '/', window.location.origin)
      .toString()
      .replace(/\/$/, '');
  }

  return BASE_URL.replace(/\/api\/?$/, '');
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, // 2 min for large images
});

/**
 * Upload an image for asset detection.
 */
export async function detectAssets(file, confidence = 0.35, useSahi = true) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('confidence', confidence.toString());
  formData.append('use_sahi', useSahi.toString());

  const response = await api.post('/detect', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

/**
 * Retrieve a stored detection result.
 */
export async function getDetectionResult(jobId) {
  const response = await api.get(`/detect/${jobId}`);
  return response.data;
}

/**
 * Download detection results in specified format.
 */
export async function downloadExport(jobId, format) {
  const response = await api.get(`/export/${jobId}/${format}`, {
    responseType: 'blob',
  });

  const extMap = { geojson: 'geojson', csv: 'csv', shapefile: 'zip' };
  const ext = extMap[format] || format;
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `detections_${jobId}.${ext}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Change Detection — Compare two temporal images.
 */
export async function compareImages(fileBefore, fileAfter, sensitivity = 0.3) {
  const formData = new FormData();
  formData.append('file_before', fileBefore);
  formData.append('file_after', fileAfter);
  formData.append('sensitivity', sensitivity.toString());

  const response = await api.post('/change-detect', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

/**
 * 3D Height Estimation from shadow analysis.
 */
export async function estimateHeights(file, sunElevation = 45, gsd = 0.3) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('sun_elevation', sunElevation.toString());
  formData.append('gsd', gsd.toString());

  const response = await api.post('/height-estimate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

/**
 * Push assets to DIGIT Urban Governance Registry.
 */
export async function pushToDigit(jobId, cityName = 'Bangalore', wardNumber = 'W-001') {
  const formData = new FormData();
  formData.append('job_id', jobId);
  formData.append('city_name', cityName);
  formData.append('ward_number', wardNumber);

  const response = await api.post('/digit/push', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

/**
 * Get DIGIT Registry stats.
 */
export async function getDigitStats() {
  const response = await api.get('/digit/stats');
  return response.data;
}

/**
 * Download PDF audit report.
 */
export async function downloadReport(jobId, cityName = 'Bangalore', wardNumber = 'W-001') {
  const formData = new FormData();
  formData.append('city_name', cityName);
  formData.append('ward_number', wardNumber);

  const response = await api.post(`/report/${jobId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `audit_report_${jobId.slice(0, 8)}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function getAssetUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${getBackendBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Get WebSocket URL for live stream.
 */
export function getStreamWsUrl() {
  const backendBaseUrl = getBackendBaseUrl();
  if (backendBaseUrl.startsWith('https://')) {
    return `${backendBaseUrl.replace('https://', 'wss://')}/api/stream`;
  }
  if (backendBaseUrl.startsWith('http://')) {
    return `${backendBaseUrl.replace('http://', 'ws://')}/api/stream`;
  }

  if (typeof window !== 'undefined') {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.host}/api/stream`;
  }

  return '/api/stream';
}

/**
 * Upload and process a drone video file.
 */
export async function processVideo(file, confidence = 0.35, maxFrames = 60, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('confidence', confidence.toString());
  formData.append('max_frames', maxFrames.toString());

  const response = await api.post('/video-process', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000, // 5 min for long videos
    onUploadProgress: onProgress,
  });
  return response.data;
}

export default api;
