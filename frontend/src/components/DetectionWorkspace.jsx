import React from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle,
  Cloud,
  Download,
  FileText,
  Image as ImageIcon,
  Map as MapIcon,
  Ruler,
  SlidersHorizontal,
} from 'lucide-react';
import { useDetectionStore } from '../store/detectionStore';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../utils/colorMap';
import AssetSummary from './AssetSummary';
import ConfidenceFilter from './ConfidenceFilter';
import DetectionOverlay from './DetectionOverlay';
import DIGITPanel from './DIGITPanel';
import ExportPanel from './ExportPanel';
import HeightPanel from './HeightPanel';
import MapView from './MapView';
import ReportPanel from './ReportPanel';

const LEGACY_TAB_MAP = {
  overlay: 'review',
  map: 'map',
};

function PageHero({ kicker, title, description, stats }) {
  return (
    <div className="soft-hero-panel">
      <div className="space-y-2">
        <p className="soft-kicker">{kicker}</p>
        <h3 className="soft-title">{title}</h3>
        <p className="soft-copy max-w-3xl">{description}</p>
      </div>

      {stats?.length > 0 && (
        <div className="soft-stat-grid mt-5">
          {stats.map((stat) => (
            <div key={stat.label} className="soft-stat-card">
              <p className="soft-kicker mb-2">{stat.label}</p>
              <p className="soft-stat-value">{stat.value}</p>
              <p className="soft-copy mt-2 text-xs">{stat.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RouteCard({ title, detail, meta, onClick }) {
  return (
    <button onClick={onClick} className="soft-route-card group text-left">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="soft-route-title">{title}</p>
          <p className="soft-route-copy">{detail}</p>
        </div>
        <ArrowRight size={16} className="soft-route-arrow" />
      </div>
      <div className="soft-route-meta">{meta}</div>
    </button>
  );
}

function InsightList({ title, items }) {
  return (
    <div className="soft-card">
      <p className="soft-kicker mb-3">{title}</p>
      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-2 text-xs leading-6 text-slate-600">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-brand-500" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniCategoryList({ entries, threshold }) {
  return (
    <div className="soft-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="soft-kicker mb-1">Visible classes</p>
          <p className="text-sm font-semibold text-slate-900">What survives the current review settings</p>
        </div>
        <div className="soft-pill">{Math.round(threshold * 100)}% threshold</div>
      </div>

      <div className="space-y-2.5">
        {entries.map(([category, stats]) => {
          const color = CATEGORY_COLORS[category] || '#ffffff';
          const label = CATEGORY_LABELS[category] || category;
          return (
            <div key={category} className="soft-list-row">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="category-dot" style={{ backgroundColor: color }} />
                  <span className="text-xs font-semibold text-slate-900">{label}</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">{stats.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min((stats.avg_confidence || 0) * 100, 100)}%`,
                    background: `linear-gradient(90deg, ${color}88, ${color})`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetectionStatus({ confidence }) {
  if (confidence >= 0.8) return <span className="soft-status-chip soft-status-chip-success">Verified</span>;
  if (confidence >= 0.55) return <span className="soft-status-chip soft-status-chip-warning">Strong signal</span>;
  return <span className="soft-status-chip soft-status-chip-neutral">Needs review</span>;
}

function RecentDetections({ detections = [] }) {
  const entries = detections.slice(0, 4);

  const renderMeta = (detection) => {
    if (Array.isArray(detection.bbox_geo) && detection.bbox_geo.length === 4) {
      const [lon1, lat1, lon2, lat2] = detection.bbox_geo;
      const lat = ((lat1 + lat2) / 2).toFixed(4);
      const lon = ((lon1 + lon2) / 2).toFixed(4);
      return `${lat} N, ${lon} E`;
    }

    if (detection.area_sqm) {
      return `${detection.area_sqm.toFixed(1)} m² estimated footprint`;
    }

    return `${Math.round(detection.confidence * 100)}% confidence candidate`;
  };

  return (
    <div className="soft-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="soft-kicker mb-1">Recent detections</p>
          <p className="text-lg font-semibold text-slate-950">What the current scene is surfacing first</p>
        </div>
        <div className="soft-pill">{entries.length} shown</div>
      </div>

      <div className="space-y-3">
        {entries.length === 0 && (
          <div className="soft-empty-state">
            Adjust the filters or open Scene Controls if you want a broader visible set.
          </div>
        )}

        {entries.map((detection, index) => (
          <div key={`${detection.category}-${index}`} className="soft-detection-row">
            <div className="flex items-center gap-3">
              <div
                className="soft-detection-mark"
                style={{ backgroundColor: `${detection.color || CATEGORY_COLORS[detection.category] || '#149760'}18` }}
              >
                <span
                  className="h-4 w-4 rounded-md"
                  style={{ backgroundColor: detection.color || CATEGORY_COLORS[detection.category] || '#149760' }}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {CATEGORY_LABELS[detection.category] || detection.category}
                </p>
                <p className="text-xs text-slate-500">{renderMeta(detection)}</p>
              </div>
            </div>

            <div className="text-right">
              <DetectionStatus confidence={detection.confidence} />
              <p className="mt-2 text-[11px] font-mono text-slate-500">
                {Math.round(detection.confidence * 100)}% confidence
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkflowReadiness({ readinessPercent, hasGeoData, heightResult, digitResult, onOpen }) {
  let nextAction = { label: 'Open review canvas', key: 'review' };

  if (!hasGeoData) {
    nextAction = { label: 'Open scene controls', key: 'controls' };
  } else if (!heightResult) {
    nextAction = { label: 'Run height lab', key: 'heights' };
  } else if (!digitResult) {
    nextAction = { label: 'Prepare DIGIT handoff', key: 'digit' };
  } else {
    nextAction = { label: 'Generate report pack', key: 'report' };
  }

  return (
    <div className="soft-success-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="soft-success-kicker">Workflow readiness</p>
          <p className="text-xl font-semibold text-white">Current scan posture</p>
        </div>
        <div className="soft-live-pill">Ready</div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-4">
        <div className="soft-progress-ring" style={{ '--progress-value': `${readinessPercent}%` }}>
          <div className="soft-progress-ring-center">
            <strong>{readinessPercent}%</strong>
            <span>ready</span>
          </div>
        </div>

        <p className="text-center text-sm leading-6 text-emerald-50/84">
          Detection is complete. Use the quick launch below to step into the next best workspace without scanning through everything again.
        </p>
      </div>

      <div className="mt-6 grid gap-2">
        <button onClick={() => onOpen(nextAction.key)} className="soft-success-button">
          {nextAction.label}
        </button>
        <button onClick={() => onOpen('map')} className="soft-success-button soft-success-button-secondary">
          Open GIS explorer
        </button>
        <button onClick={() => onOpen('exports')} className="soft-success-button soft-success-button-secondary">
          Jump to exports
        </button>
      </div>
    </div>
  );
}

export default function DetectionWorkspace({ hasGeoData }) {
  const {
    activeTab,
    confidenceThreshold,
    detectionResult,
    digitResult,
    heightResult,
    selectedCategories,
    setActiveTab,
    jobId,
  } = useDetectionStore();

  if (!detectionResult) return null;

  const normalizedTab = LEGACY_TAB_MAP[activeTab] || activeTab || 'overview';
  const allDetections = detectionResult.detections || [];
  const activeCategories = selectedCategories || [...new Set(allDetections.map((detection) => detection.category))];
  const visibleDetections = allDetections.filter(
    (detection) => detection.confidence >= confidenceThreshold && activeCategories.includes(detection.category)
  );
  const summaryEntries = Object.entries(detectionResult.summary || {}).sort((a, b) => b[1].count - a[1].count);
  const visibleSummaryEntries = summaryEntries.filter(([category]) => activeCategories.includes(category));
  const dominantEntry = summaryEntries[0];
  const visibleAverageConfidence = visibleDetections.length
    ? visibleDetections.reduce((total, detection) => total + detection.confidence, 0) / visibleDetections.length
    : 0;
  const readinessPercent = Math.round(
    ([true, hasGeoData, Boolean(heightResult), Boolean(digitResult)].filter(Boolean).length / 4) * 100
  );

  const workspaceSections = [
    {
      key: 'overview',
      label: 'Command deck',
      description: 'Scene summary, routing, and next-step guidance.',
      icon: BarChart3,
      badge: `${visibleDetections.length} visible`,
    },
    {
      key: 'review',
      label: 'Review canvas',
      description: 'Overlay-led QA for detections and confidence hotspots.',
      icon: ImageIcon,
      badge: `${detectionResult.total_detections} total`,
    },
    {
      key: 'map',
      label: 'GIS explorer',
      description: 'Map-native inspection for geo-referenced scans.',
      icon: MapIcon,
      badge: hasGeoData ? 'GIS ready' : 'Pixel mode',
    },
    {
      key: 'controls',
      label: 'Scene controls',
      description: 'Threshold and category tuning for cleaner operations.',
      icon: SlidersHorizontal,
      badge: `${Math.round(confidenceThreshold * 100)}%`,
    },
    {
      key: 'heights',
      label: 'Height lab',
      description: 'Shadow-based building height estimation.',
      icon: Ruler,
      badge: heightResult ? `${heightResult.total_buildings} ready` : 'Optional',
    },
    {
      key: 'exports',
      label: 'Export hub',
      description: 'Package the scan for GIS and spreadsheet teams.',
      icon: Download,
      badge: '3 formats',
    },
    {
      key: 'report',
      label: 'Report studio',
      description: 'Create a stakeholder-ready audit report.',
      icon: FileText,
      badge: 'PDF',
    },
    {
      key: 'digit',
      label: 'DIGIT handoff',
      description: 'Push curated records into the registry workflow.',
      icon: Cloud,
      badge: digitResult ? 'Synced' : 'Ready',
    },
  ];

  const routeCards = workspaceSections.filter((section) => section.key !== 'overview');

  const renderPage = () => {
    if (normalizedTab === 'review') {
      return (
        <div className="space-y-5">
          <PageHero
            kicker="Review Canvas"
            title="Inspect every detection in a calmer, operator-first visual surface."
            description="Use this page for scan-by-scan QA. The overlay is isolated here so the scene can breathe, while summary context and review guidance stay nearby instead of being mixed with export and reporting controls."
            stats={[
              {
                label: 'Visible detections',
                value: visibleDetections.length,
                detail: 'Filtered by the current confidence threshold and active category selection.',
              },
              {
                label: 'Average confidence',
                value: `${Math.round(visibleAverageConfidence * 100)}%`,
                detail: 'A quick confidence read on what remains visible in the current review state.',
              },
              {
                label: 'Primary scene signal',
                value: dominantEntry ? (CATEGORY_LABELS[dominantEntry[0]] || dominantEntry[0]) : 'None',
                detail: 'The dominant class is the first place most operators should validate on dense scans.',
              },
            ]}
          />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_360px]">
            <div className="glass-card-static p-4 md:p-5">
              <div className="mb-4 flex flex-col gap-3 border-b border-surface-700/18 pb-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="panel-kicker mb-1">Primary visual QA surface</p>
                  <p className="text-sm font-semibold text-white">Detection overlay with hover inspection and confidence-ranked rendering.</p>
                </div>
                <div className="subtle-badge">
                  <Activity size={12} />
                  Top detections prioritized
                </div>
              </div>
              <DetectionOverlay />
            </div>

            <div className="space-y-4">
              <AssetSummary />
              <InsightList
                title="How to review effectively"
                items={[
                  'Start with the densest color clusters and confirm the dominant class before lowering threshold.',
                  'Use hover inspection to validate confidence and area where segmentation masks are available.',
                  'If a dense scene feels noisy, move to Scene Controls next instead of forcing manual interpretation here.',
                ]}
              />
            </div>
          </div>
        </div>
      );
    }

    if (normalizedTab === 'map') {
      return (
        <div className="space-y-5">
          <PageHero
            kicker="GIS Explorer"
            title="Shift from pixel review into map-native validation and export readiness."
            description="This page is dedicated to geographic inspection. When the source scene carries CRS metadata, detections become immediately useful for map QA, shape verification, and handoff into broader GIS operations."
            stats={[
              {
                label: 'Geo status',
                value: hasGeoData ? 'Ready' : 'Standby',
                detail: hasGeoData
                  ? 'This scan includes enough spatial metadata for geographic overlays.'
                  : 'The current scan is still valid for overlay review, but lacks map coordinates.',
              },
              {
                label: 'Best use',
                value: hasGeoData ? 'QA + export' : 'Preview',
                detail: 'Use GIS mode to confirm footprint placement before downstream exports leave the workspace.',
              },
              {
                label: 'Downstream fit',
                value: 'GeoJSON',
                detail: 'Map review lines up directly with the export formats available in the export hub.',
              },
            ]}
          />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.28fr)_360px]">
            <div className="glass-card-static p-4 md:p-5">
              <MapView />
            </div>

            <div className="space-y-4">
              <InsightList
                title="What this mode is for"
                items={[
                  'Validate that footprints land where operators expect them to land before sharing GIS outputs.',
                  'Open a popup on any polygon to inspect the class, confidence, and area estimate where available.',
                  'Use this page as the final pre-export QA step when you have GeoTIFF or CRS-aware imagery.',
                ]}
              />
              <InsightList
                title="If the map is not active"
                items={[
                  'The scan can still support overlay review, heights, reporting, and DIGIT push without coordinates.',
                  'To unlock GIS mode, upload GeoTIFF or imagery that preserves CRS metadata through preprocessing.',
                  'You can still export CSV and reporting outputs even when geographic polygons are unavailable.',
                ]}
              />
            </div>
          </div>
        </div>
      );
    }

    if (normalizedTab === 'controls') {
      return (
        <div className="space-y-5">
          <PageHero
            kicker="Scene Controls"
            title="Tune what operators see before results leave the room."
            description="This page isolates filtering so you can make deliberate decisions about confidence, category visibility, and noise management. It turns the raw scan into a cleaner operational view without forcing stakeholders to parse clutter."
            stats={[
              {
                label: 'Threshold',
                value: `${Math.round(confidenceThreshold * 100)}%`,
                detail: 'Higher thresholds trade breadth for certainty; lower thresholds surface more possible hits.',
              },
              {
                label: 'Active classes',
                value: activeCategories.length,
                detail: 'Only the categories shown here remain active across overlay and map review surfaces.',
              },
              {
                label: 'Scene retained',
                value: visibleDetections.length,
                detail: 'This is the count that downstream reviewers effectively experience right now.',
              },
            ]}
          />

          <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="space-y-4">
              <InsightList
                title="Recommended operating ranges"
                items={[
                  'Use roughly 35% to explore the scene and preserve weak but possibly meaningful detections.',
                  'Move toward 50 to 60% when presenting a cleaner shortlist to internal reviewers.',
                  'Push higher only when you want a strict, executive-facing read with fewer borderline detections.',
                ]}
              />
              <MiniCategoryList entries={visibleSummaryEntries.slice(0, 4)} threshold={confidenceThreshold} />
            </div>

            <ConfidenceFilter />
          </div>
        </div>
      );
    }

    if (normalizedTab === 'heights') {
      return (
        <div className="space-y-5">
          <PageHero
            kicker="Height Lab"
            title="Estimate vertical massing before you ask a field team to verify it."
            description="This page is reserved for height estimation so the method, caveats, and resulting numbers stay together. It is best used after visual review confirms that the building detections themselves are trustworthy."
            stats={[
              {
                label: 'Method',
                value: 'Shadow',
                detail: 'The current estimator infers height from detected building footprints and visible shadow geometry.',
              },
              {
                label: 'Best imagery',
                value: 'Clear sun',
                detail: 'Strong directional lighting and unobstructed roofs produce the cleanest shadow signal.',
              },
              {
                label: 'Field role',
                value: 'Pre-check',
                detail: 'Treat these numbers as planning support before formal survey or engineering confirmation.',
              },
            ]}
          />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <HeightPanel />

            <div className="space-y-4">
              <InsightList
                title="How to trust this page"
                items={[
                  'Run height estimation after you are satisfied with the building detections in the review canvas.',
                  'Expect better results on scenes with longer, cleaner shadows and minimal occlusion from trees.',
                  'Use floor counts as a directional planning hint, not as a regulatory truth source.',
                ]}
              />
              <InsightList
                title="Where it helps most"
                items={[
                  'Prioritizing structures that may need deeper review for compliance or infrastructure planning.',
                  'Creating a richer narrative in executive reports without waiting for a separate modeling pass.',
                  'Adding another decision layer before pushing records into civic or governance systems.',
                ]}
              />
            </div>
          </div>
        </div>
      );
    }

    if (normalizedTab === 'exports') {
      return (
        <div className="space-y-5">
          <PageHero
            kicker="Export Hub"
            title="Package the scan once and hand it to every downstream team in the right format."
            description="This page is dedicated to delivery. Keep export choices, use cases, and GIS expectations together so there is no confusion about which file belongs to which consumer."
            stats={[
              {
                label: 'Formats',
                value: '03',
                detail: 'GeoJSON, CSV, and Shapefile are available from the same detection job.',
              },
              {
                label: 'Job reference',
                value: jobId ? jobId.slice(0, 8) : 'N/A',
                detail: 'Every export maps back to a single stored detection run for cleaner auditability.',
              },
              {
                label: 'Best timing',
                value: 'Post-QA',
                detail: 'Export after review and controls are tuned so downstream teams receive the right picture.',
              },
            ]}
          />

          <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <ExportPanel />

            <div className="space-y-4">
              <div className="soft-card">
                <p className="soft-kicker mb-3">Format chooser</p>
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    ['GeoJSON', 'Best for web maps, GIS tools, and modern spatial pipelines.'],
                    ['CSV', 'Best for review sheets, bulk QA, and spreadsheet-based operations.'],
                    ['Shapefile', 'Best when teams still rely on ESRI-compatible desktop GIS workflows.'],
                  ].map(([title, detail]) => (
                    <div key={title} className="soft-stat-card">
                      <p className="text-sm font-semibold text-slate-950">{title}</p>
                      <p className="mt-2 text-xs leading-6 text-slate-600">{detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <InsightList
                title="Delivery guidance"
                items={[
                  'Use GIS Explorer first when spatial alignment matters before shipping GeoJSON or Shapefile.',
                  'CSV is the fastest route when stakeholders care more about counts and attributes than geometry.',
                  'Because all exports come from one job reference, reporting and registry handoff stay aligned.',
                ]}
              />
            </div>
          </div>
        </div>
      );
    }

    if (normalizedTab === 'report') {
      return (
        <div className="space-y-5">
          <PageHero
            kicker="Report Studio"
            title="Turn the current scan into an executive-ready packet without leaving the workspace."
            description="This page isolates reporting so the audience, metadata, and narrative expectations stay explicit. It is built for teams that need a polished artifact rather than another raw dashboard screenshot."
            stats={[
              {
                label: 'Audience',
                value: 'Exec + ops',
                detail: 'Use the generated PDF for internal briefings, civic communication, and stakeholder review.',
              },
              {
                label: 'Inputs',
                value: 'Scene + city',
                detail: 'The report is anchored to the detection job and the governance metadata you enter here.',
              },
              {
                label: 'Output',
                value: 'PDF',
                detail: 'A downloadable document summarizing detections, context, and supporting metrics.',
              },
            ]}
          />

          <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <ReportPanel />

            <div className="space-y-4">
              <InsightList
                title="What makes a strong report"
                items={[
                  'Tune your scene controls first so the report reflects the exact confidence posture you intend to share.',
                  'Fill in city and ward metadata carefully because those values become part of the delivery context.',
                  'Use the resulting PDF as a briefing artifact, then keep exports and DIGIT handoff tied to the same job.',
                ]}
              />
              <div className="soft-card">
                <p className="soft-kicker mb-3">Typical readers</p>
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    ['Program leads', 'Need a quick scan narrative and counts without navigating the full workspace.'],
                    ['Field teams', 'Need a concise pack that helps validate what deserves on-ground verification.'],
                    ['Governance stakeholders', 'Need a structured deliverable aligned with city and ward metadata.'],
                  ].map(([title, detail]) => (
                    <div key={title} className="soft-stat-card">
                      <p className="text-sm font-semibold text-slate-950">{title}</p>
                      <p className="mt-2 text-xs leading-6 text-slate-600">{detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (normalizedTab === 'digit') {
      return (
        <div className="space-y-5">
          <PageHero
            kicker="DIGIT Handoff"
            title="Promote validated detections into a governance-ready registry workflow."
            description="This page is reserved for registry handoff so operational metadata, push actions, and downstream readiness stay together. Treat it as the final handoff step once review, controls, and reporting are in shape."
            stats={[
              {
                label: 'Push state',
                value: digitResult ? 'Synced' : 'Pending',
                detail: digitResult
                  ? 'The current job has already been registered through the DIGIT mock integration.'
                  : 'No registry handoff has been triggered yet for this job.',
              },
              {
                label: 'Metadata',
                value: 'City + ward',
                detail: 'The registry record is contextualized by the civic identifiers entered on this page.',
              },
              {
                label: 'Best step',
                value: 'Final',
                detail: 'Push after QA and reporting so the registry inherits the correct operational narrative.',
              },
            ]}
          />

          <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <DIGITPanel />

            <div className="space-y-4">
              <InsightList
                title="Recommended handoff sequence"
                items={[
                  'Complete visual QA in Review Canvas and tighten thresholds in Scene Controls first.',
                  'Export or generate the executive report if those artifacts need to accompany the registry handoff.',
                  'Use the DIGIT push only when the scene is ready to become part of a wider governance workflow.',
                ]}
              />
              <div className="soft-card">
                <p className="soft-kicker mb-3">What this page represents</p>
                <div className="space-y-2.5 text-xs leading-6 text-slate-600">
                  <p>
                    DIGIT handoff is less about analytics and more about controlled promotion into a downstream civic system.
                    Keeping it on its own page prevents registry actions from competing visually with review and export tasks.
                  </p>
                  {digitResult && (
                    <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <CheckCircle size={14} />
                        Latest push completed
                      </div>
                      <p className="mt-2 text-[11px] leading-5 text-emerald-800">
                        {digitResult.totalRegistered} assets were registered for tenant {digitResult.tenantId}.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_360px]">
          <RecentDetections detections={visibleDetections} />

          <WorkflowReadiness
            readinessPercent={readinessPercent}
            hasGeoData={hasGeoData}
            heightResult={heightResult}
            digitResult={digitResult}
            onOpen={setActiveTab}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_360px]">
          <div className="soft-card p-0 overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="soft-kicker mb-1">Visual anchor</p>
                <p className="text-lg font-semibold text-slate-950">Scene snapshot before deeper review</p>
              </div>
              <button onClick={() => setActiveTab('review')} className="btn-ghost text-xs">
                Open review canvas
              </button>
            </div>
            <div className="bg-slate-950 p-4">
              <DetectionOverlay />
            </div>
          </div>

          <AssetSummary />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          {routeCards.map((section) => (
            <RouteCard
              key={section.key}
              title={section.label}
              detail={section.description}
              meta={section.badge}
              onClick={() => setActiveTab(section.key)}
            />
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {[
            [
              '1. Review first',
              'Validate the scan visually in Review Canvas before you promote anything into exports, reports, or registry systems.',
            ],
            [
              '2. Tune second',
              'Use Scene Controls to make the operational picture intentional rather than dumping the raw detector output downstream.',
            ],
            [
              '3. Deliver last',
              'Choose the page that matches the consumer: GIS Explorer, Export Hub, Report Studio, or DIGIT Handoff.',
            ],
          ].map(([title, detail]) => (
            <div key={title} className="soft-stat-card">
              <p className="text-sm font-semibold text-slate-950">{title}</p>
              <p className="mt-2 text-xs leading-6 text-slate-600">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return <div className="space-y-5">{renderPage()}</div>;
}
