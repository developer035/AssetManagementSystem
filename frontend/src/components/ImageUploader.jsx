import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Satellite, Layers, Map, FileText, ArrowUpRight } from 'lucide-react';
import { useDetectionStore } from '../store/detectionStore';
import { detectAssets } from '../services/api';

const FEATURE_CARDS = [
  {
    title: 'Detection cockpit',
    detail: 'Review overlay results with category counts, filters, and confidence controls.',
    icon: Layers,
  },
  {
    title: 'GIS exports',
    detail: 'Move straight into GeoJSON, CSV, Shapefile, and map-native workflows.',
    icon: Map,
  },
  {
    title: 'Executive outputs',
    detail: 'Generate reports, height estimates, and registry-ready records without rework.',
    icon: FileText,
  },
];

export default function ImageUploader() {
  const {
    setUploadedImage,
    setLoading,
    setError,
    setDetectionResult,
    confidenceThreshold,
    isLoading,
  } = useDetectionStore();

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadedImage(file);
    setLoading(true);

    try {
      const result = await detectAssets(file, confidenceThreshold);
      setDetectionResult(result);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        (typeof err.response?.data === 'string' ? err.response.data : null) ||
        err.message ||
        'Detection failed. Please try again.';
      setError(msg);
    }
  }, [confidenceThreshold, setUploadedImage, setLoading, setError, setDetectionResult]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp'] },
    maxFiles: 1,
    disabled: isLoading,
  });

  return (
    <div
      {...getRootProps()}
      id="image-upload-dropzone"
      className={`
        relative cursor-pointer overflow-hidden rounded-[30px] border border-dashed p-6 transition-all duration-300 ease-out md:p-7
        ${isDragActive
          ? 'dropzone-active border-brand-300 bg-brand-500/5'
          : 'border-surface-700/30 hover:border-brand-500/30 hover:bg-white/[0.02]'
        }
        ${isLoading ? 'pointer-events-none opacity-50' : ''}
      `}
    >
      <input {...getInputProps()} id="image-upload-input" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(224,191,114,0.14),transparent_26%),linear-gradient(125deg,rgba(255,255,255,0.06),transparent_18%)] opacity-90" />

      <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="space-y-6">
          <span className="eyebrow">Launch Detection</span>

          <div className="space-y-3">
            <div className={`
              flex h-16 w-16 items-center justify-center rounded-[24px] border transition-all duration-300
              ${isDragActive
                ? 'border-brand-300/60 bg-brand-500/16'
                : 'border-surface-700/30 bg-surface-800/50'
              }
            `}>
              {isDragActive ? (
                <Satellite className="h-8 w-8 text-brand-200 animate-pulse" />
              ) : (
                <Upload className="h-8 w-8 text-brand-200" />
              )}
            </div>

            <div className="space-y-2">
              <h3 className="font-display text-3xl font-semibold tracking-[-0.05em] text-white">
                {isDragActive ? 'Drop your scene to begin the scan.' : 'Bring in your next satellite or drone capture.'}
              </h3>
              <p className="max-w-2xl text-sm leading-7 text-surface-200/72">
                Upload a still image and step directly into premium visual review, GIS-ready exports, 3D height estimation, civic reporting, and registry handoff.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['JPG', 'PNG', 'GeoTIFF', 'WebP', '50MB max'].map((fmt) => (
              <span key={fmt} className="feature-pill">
                {fmt}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-[24px] border border-surface-700/20 bg-surface-900/55 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Choose an image directly if drag-and-drop feels unreliable.</p>
              <p className="mt-1 text-xs leading-6 text-surface-200/66">
                The upload path supports both direct file picking and drag-and-drop. GeoTIFF, PNG, JPG, and WebP are all accepted.
              </p>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                open();
              }}
              className="btn-primary inline-flex items-center justify-center gap-2 text-xs"
            >
              <Upload size={14} />
              Choose image
              <ArrowUpRight size={13} />
            </button>
          </div>

          <div className="rounded-[24px] border border-surface-700/20 bg-surface-900/55 p-4">
            <p className="panel-kicker mb-2">Recommended flow</p>
            <div className="grid gap-3 text-xs text-surface-200/74 sm:grid-cols-3">
              {[
                'Upload the highest-resolution orthomosaic or still you have.',
                'Refine what appears with confidence and category filters.',
                'Export spatial outputs or generate the executive report.',
              ].map((step, index) => (
                <div key={step} className="rounded-2xl border border-surface-700/15 bg-white/[0.02] p-3 leading-6">
                  <span className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-500/12 text-[11px] font-semibold text-brand-200">
                    {index + 1}
                  </span>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {FEATURE_CARDS.map(({ title, detail, icon: Icon }) => (
            <div key={title} className="metric-card">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl border border-brand-500/18 bg-brand-500/10 p-3 text-brand-200">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-1 text-xs leading-6 text-surface-200/68">{detail}</p>
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-[24px] border border-brand-500/14 bg-gradient-to-br from-brand-500/10 via-transparent to-emerald-500/10 p-4">
            <p className="panel-kicker mb-2">Inference blend</p>
            <p className="text-sm font-semibold text-white">5 model specialists + land-cover analysis</p>
            <p className="mt-2 text-xs leading-6 text-surface-200/68">
              Designed to catch structured urban assets and softer spatial cover types in one premium review surface.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
