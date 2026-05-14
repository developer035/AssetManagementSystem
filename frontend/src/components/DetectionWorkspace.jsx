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
  Layers,
  Map as MapIcon,
  RotateCcw,
  Ruler,
  SlidersHorizontal,
} from 'lucide-react';
import { useDetectionStore } from '../store/detectionStore';
import { CATEGORY_COLORS } from '../utils/colorMap';
import AssetSummary from './AssetSummary';
import ConfidenceFilter from './ConfidenceFilter';
import DetectionOverlay from './DetectionOverlay';
import DIGITPanel from './DIGITPanel';
import ExportPanel from './ExportPanel';
import HeightPanel from './HeightPanel';
import ImageUploader from './ImageUploader';
import MapView from './MapView';
import ReportPanel from './ReportPanel';

const LEGACY_TAB_MAP = {
  overlay: 'review',
  map: 'map',
};

function PageHero({ kicker, title, description, stats }) {
  return (
    <div className="workspace-page-hero">
      <div className="space-y-3">
        <p className="panel-kicker">{kicker}</p>
        <h3 className="font-display text-2xl font-semibold tracking-[-0.04em] text-white md:text-[2.2rem]">
          {title}
        </h3>
        <p className="max-w-3xl text-sm leading-7 text-surface-200/74 md:text-[15px]">
          {description}
        </p>
      </div>

      {stats?.length > 0 && (
        <div className="workspace-stat-grid mt-5">
          {stats.map((stat) => (
            <div key={stat.label} className="metric-card">
              <p className="panel-kicker mb-2">{stat.label}</p>
              <p className="text-2xl font-semibold tracking-[-0.04em] text-white">{stat.value}</p>
              <p className="mt-2 text-xs leading-6 text-surface-300/66">{stat.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RouteCard({ title, detail, meta, onClick }) {
  return (
    <button onClick={onClick} className="workspace-route-card group text-left">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-2 text-xs leading-6 text-surface-300/66">{detail}</p>
        </div>
        <ArrowRight size={16} className="mt-1 text-surface-300/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand-200" />
      </div>
      <div className="section-divider mt-4 pt-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-200/82">
        {meta}
      </div>
    </button>
  );
}

function InsightList({ title, items }) {
  return (
    <div className="glass-card p-5">
      <p className="panel-kicker mb-3">{title}</p>
      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-2 text-xs leading-6 text-surface-200/74">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-brand-300" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniCategoryList({ entries, threshold }) {
  return (
    <div className="glass-card p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="panel-kicker mb-1">Visible classes</p>
          <p className="text-sm font-semibold text-white">What survives the current review settings</p>
        </div>
        <div className="subtle-badge">{Math.round(threshold * 100)}% threshold</div>
      </div>

      <div className="space-y-2.5">
        {entries.map(([category, stats]) => {
          const color = CATEGORY_COLORS[category] || '#ffffff';
          return (
            <div key={category} className="rounded-[20px] border border-surface-700/18 bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="category-dot" style={{ backgroundColor: color }} />
                  <span className="text-xs font-semibold text-white">{category}</span>
                </div>
                <span className="text-[11px] font-mono text-surface-200/72">{stats.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-800/80">
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

export default function DetectionWorkspace({ hasGeoData }) {
  const {
    activeTab,
    confidenceThreshold,
    detectionResult,
    digitResult,
    heightResult,
    imageUrl,
    jobId,
    resetAll,
    selectedCategories,
    setActiveTab,
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
                value: dominantEntry ? dominantEntry[0] : 'None',
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
                  'Move toward 50–60% when presenting a cleaner shortlist to internal reviewers.',
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
              <div className="glass-card p-5">
                <p className="panel-kicker mb-3">Format chooser</p>
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    ['GeoJSON', 'Best for web maps, GIS tools, and modern spatial pipelines.'],
                    ['CSV', 'Best for review sheets, bulk QA, and spreadsheet-based operations.'],
                    ['Shapefile', 'Best when teams still rely on ESRI-compatible desktop GIS workflows.'],
                  ].map(([title, detail]) => (
                    <div key={title} className="metric-card">
                      <p className="text-sm font-semibold text-white">{title}</p>
                      <p className="mt-2 text-xs leading-6 text-surface-300/68">{detail}</p>
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
              <div className="glass-card p-5">
                <p className="panel-kicker mb-3">Typical readers</p>
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    ['Program leads', 'Need a quick scan narrative and counts without navigating the full workspace.'],
                    ['Field teams', 'Need a concise pack that helps validate what deserves on-ground verification.'],
                    ['Governance stakeholders', 'Need a structured deliverable aligned with city and ward metadata.'],
                  ].map(([title, detail]) => (
                    <div key={title} className="metric-card">
                      <p className="text-sm font-semibold text-white">{title}</p>
                      <p className="mt-2 text-xs leading-6 text-surface-300/68">{detail}</p>
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
              <div className="glass-card p-5">
                <p className="panel-kicker mb-3">What this page represents</p>
                <div className="space-y-2.5 text-xs leading-6 text-surface-200/74">
                  <p>
                    DIGIT handoff is less about analytics and more about controlled promotion into a downstream civic system.
                    Keeping it on its own page prevents registry actions from competing visually with review and export tasks.
                  </p>
                  {digitResult && (
                    <div className="rounded-[20px] border border-emerald-500/18 bg-emerald-500/10 p-3 text-emerald-200">
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <CheckCircle size={14} />
                        Latest push completed
                      </div>
                      <p className="mt-2 text-[11px] leading-5 text-emerald-100/80">
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
        <PageHero
          kicker="Command Deck"
          title="Your scan is now organized as a true multi-page workspace, not a single scrolling wall."
          description="Start here to understand the scene and branch into the exact feature page you need next. Each downstream capability now has its own dedicated surface, explanation, and action context so operators can stay oriented."
          stats={[
            {
              label: 'Detected assets',
              value: detectionResult.total_detections,
              detail: 'The full raw scene count returned by the hybrid detection stack.',
            },
            {
              label: 'Visible now',
              value: visibleDetections.length,
              detail: 'What remains after current thresholding and category visibility rules are applied.',
            },
            {
              label: 'Spatial readiness',
              value: hasGeoData ? 'GIS' : 'Pixel',
              detail: hasGeoData
                ? 'This scan is ready for geographic inspection and spatial exports.'
                : 'This scan is optimized for overlay review, reporting, and governance workflows.',
            },
          ]}
        />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="glass-card-static p-4 md:p-5">
            <div className="mb-4 flex flex-col gap-3 border-b border-surface-700/18 pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="panel-kicker mb-1">Scene snapshot</p>
                <p className="text-sm font-semibold text-white">A quick visual anchor before you branch into a dedicated feature page.</p>
              </div>
              <button onClick={() => setActiveTab('review')} className="btn-ghost text-xs">
                Open review canvas
              </button>
            </div>
            <DetectionOverlay />
          </div>

          <AssetSummary />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
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
            <div key={title} className="metric-card">
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="mt-2 text-xs leading-6 text-surface-300/68">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="workspace-layout">
      <aside className="workspace-sidebar space-y-4">
        <div className="glass-card p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="panel-kicker mb-2">Live scene brief</p>
              <p className="text-sm font-semibold text-white">One place to orient before diving into the specialist pages.</p>
            </div>
            <button onClick={resetAll} className="btn-ghost inline-flex items-center gap-1.5 text-xs">
              <RotateCcw size={13} />
              New scan
            </button>
          </div>

          <div className="workspace-thumbnail">
            {imageUrl && <img src={imageUrl} alt="Latest uploaded scene" className="workspace-thumbnail-image" />}
            <div className="workspace-thumbnail-overlay" />
            <div className="workspace-thumbnail-content">
              <div className="stat-badge">
                <Layers size={12} />
                {detectionResult.total_detections} detections
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  {dominantEntry ? `${dominantEntry[0]} leads this scene.` : 'Scene ready for review.'}
                </p>
                <p className="text-xs leading-6 text-surface-200/70">
                  {hasGeoData
                    ? 'Geo-aware scan with export and map review available immediately.'
                    : 'Pixel-based scan with overlay review, reporting, and registry workflows ready.'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ['Visible', visibleDetections.length],
              ['Classes', activeCategories.length],
              ['Mean', `${Math.round(visibleAverageConfidence * 100)}%`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[20px] border border-surface-700/18 bg-surface-900/60 p-3 text-center">
                <p className="text-sm font-semibold text-white">{value}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-surface-300/42">{label}</p>
              </div>
            ))}
          </div>

          <div className="section-divider mt-4 pt-3">
            <p className="text-[10px] font-mono text-surface-300/42">
              Job reference: {jobId || 'pending'}
            </p>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="panel-kicker mb-1">Workspace navigator</p>
              <p className="text-sm font-semibold text-white">Open the exact feature page you need.</p>
            </div>
            <div className="subtle-badge">
              <Activity size={12} />
              Multi-page
            </div>
          </div>

          <div className="workspace-nav">
            {workspaceSections.map(({ key, label, description, icon: Icon, badge }) => {
              const isActive = normalizedTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`workspace-nav-item ${isActive ? 'workspace-nav-item-active' : ''}`}
                >
                  <div className={`workspace-nav-icon ${isActive ? 'workspace-nav-icon-active' : ''}`}>
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-white">{label}</p>
                      <span className={`workspace-nav-badge ${isActive ? 'workspace-nav-badge-active' : ''}`}>
                        {badge}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-5 text-surface-300/62">{description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="glass-card p-5">
          <p className="panel-kicker mb-2">Why this flow works better</p>
          <p className="text-xs leading-6 text-surface-200/74">
            The workspace is now split into focused pages so review, controls, delivery, and governance tasks do not compete
            for attention inside one long column. Operators can stay on one task at a time without losing scene context.
          </p>
        </div>

        <details className="glass-card p-4">
          <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-white">
            <span>Upload another image</span>
            <ArrowRight size={14} className="text-surface-300/56" />
          </summary>
          <div className="mt-4">
            <ImageUploader />
          </div>
        </details>
      </aside>

      <section className="min-w-0 space-y-5">{renderPage()}</section>
    </div>
  );
}
