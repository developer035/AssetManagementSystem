import React, { useMemo, useState } from 'react';
import {
  Activity,
  Cloud,
  Download,
  FileText,
  GitCompare,
  LayoutDashboard,
  Layers,
  Map,
  Radar,
  RefreshCcw,
  Ruler,
  ScanSearch,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import ChangeWorkspace from './components/ChangeWorkspace';
import DetectionWorkspace from './components/DetectionWorkspace';
import ImageUploader from './components/ImageUploader';
import LiveWorkspace from './components/LiveWorkspace';
import { useDetectionStore } from './store/detectionStore';

const MODE_NAV = [
  {
    key: 'detect',
    label: 'Dashboard',
    description: 'Asset detection, reporting, exports, and registry handoff.',
    icon: LayoutDashboard,
  },
  {
    key: 'change',
    label: 'Change Watch',
    description: 'Compare imagery across time and isolate priority changes.',
    icon: GitCompare,
  },
  {
    key: 'live',
    label: 'Live Monitor',
    description: 'Run real-time camera review or process recorded video.',
    icon: Radar,
  },
];

const DETECTION_WORKSPACE_NAV = [
  {
    key: 'overview',
    label: 'Command deck',
    description: 'Scene summary, recent detections, and workflow routing.',
    icon: LayoutDashboard,
  },
  {
    key: 'review',
    label: 'Review canvas',
    description: 'Visual QA for overlays, masks, and confidence hotspots.',
    icon: ScanSearch,
  },
  {
    key: 'map',
    label: 'GIS explorer',
    description: 'Map-native inspection for spatially aware scenes.',
    icon: Map,
  },
  {
    key: 'controls',
    label: 'Scene controls',
    description: 'Tune threshold and category visibility before delivery.',
    icon: SlidersHorizontal,
  },
  {
    key: 'heights',
    label: 'Height lab',
    description: 'Estimate building heights from shadows and footprints.',
    icon: Ruler,
  },
  {
    key: 'exports',
    label: 'Export hub',
    description: 'Download GeoJSON, CSV, and Shapefile deliverables.',
    icon: Download,
  },
  {
    key: 'report',
    label: 'Report studio',
    description: 'Generate stakeholder-ready audit PDFs.',
    icon: FileText,
  },
  {
    key: 'digit',
    label: 'DIGIT handoff',
    description: 'Push validated records into governance workflows.',
    icon: Cloud,
  },
];

function DashboardMetric({ label, value, detail, accent = false }) {
  return (
    <div className={`dashboard-metric-card ${accent ? 'dashboard-metric-card-accent' : ''}`}>
      <p className={`dashboard-metric-label ${accent ? 'dashboard-metric-label-accent' : ''}`}>{label}</p>
      <p className={`dashboard-metric-value ${accent ? 'dashboard-metric-value-accent' : ''}`}>{value}</p>
      <p className={`dashboard-metric-detail ${accent ? 'dashboard-metric-detail-accent' : ''}`}>{detail}</p>
    </div>
  );
}

function SidebarButton({ icon: Icon, label, description, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={`dashboard-nav-button ${active ? 'dashboard-nav-button-active' : ''}`}
    >
      <span className={`dashboard-nav-icon ${active ? 'dashboard-nav-icon-active' : ''}`}>
        <Icon size={16} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="dashboard-nav-title-row">
          <span className="dashboard-nav-title">{label}</span>
          {badge && (
            <span className={`dashboard-nav-badge ${active ? 'dashboard-nav-badge-active' : ''}`}>
              {badge}
            </span>
          )}
        </span>
        <span className="dashboard-nav-description">{description}</span>
      </span>
    </button>
  );
}

function SearchResult({ label, description, onClick }) {
  return (
    <button onClick={onClick} className="dashboard-search-result">
      <span className="dashboard-search-result-title">{label}</span>
      <span className="dashboard-search-result-copy">{description}</span>
    </button>
  );
}

export default function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const {
    activeTab,
    activeView,
    changeLoading,
    changeResult,
    confidenceThreshold,
    detectionResult,
    error,
    imageUrl,
    isLoading,
    jobId,
    resetAll,
    selectedCategories,
    setActiveTab,
    setActiveView,
  } = useDetectionStore();

  const hasGeoData = Boolean(
    detectionResult?.detections?.some((det) => Array.isArray(det.bbox_geo) && det.bbox_geo.length === 4)
  );

  const activeCategories = useMemo(() => {
    if (!detectionResult?.detections?.length) return [];
    return selectedCategories || [...new Set(detectionResult.detections.map((detection) => detection.category))];
  }, [detectionResult, selectedCategories]);

  const visibleDetectionsCount = useMemo(() => {
    if (!detectionResult?.detections?.length) return 0;
    return detectionResult.detections.filter((detection) => (
      detection.confidence >= confidenceThreshold && activeCategories.includes(detection.category)
    )).length;
  }, [activeCategories, confidenceThreshold, detectionResult]);

  const activeDetectionSection = DETECTION_WORKSPACE_NAV.find((section) => section.key === activeTab)
    || DETECTION_WORKSPACE_NAV[0];

  const searchIndex = useMemo(() => {
    const items = MODE_NAV.map((item) => ({
      id: `mode-${item.key}`,
      label: item.label,
      description: item.description,
      action: () => setActiveView(item.key),
    }));

    if (detectionResult) {
      DETECTION_WORKSPACE_NAV.forEach((item) => {
        items.push({
          id: `detect-${item.key}`,
          label: item.label,
          description: item.description,
          action: () => {
            setActiveView('detect');
            setActiveTab(item.key);
          },
        });
      });
    }

    return items;
  }, [detectionResult, setActiveTab, setActiveView]);

  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];
    return searchIndex
      .filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(query))
      .slice(0, 5);
  }, [searchIndex, searchTerm]);

  const handleSearchNavigate = (item) => {
    item.action();
    setSearchTerm('');
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    if (searchResults[0]) {
      handleSearchNavigate(searchResults[0]);
    }
  };

  const intro = useMemo(() => {
    if (activeView === 'detect') {
      if (!detectionResult) {
        return {
          kicker: 'Spatial Operations',
          title: 'Spatial asset dashboard',
          description: 'Upload one clean scene and route it through review, GIS, export, reporting, and DIGIT handoff from a calmer command center.',
        };
      }

      return {
        kicker: 'Detection Workspace',
        title: activeDetectionSection.label,
        description: activeDetectionSection.description,
      };
    }

    if (activeView === 'change') {
      return {
        kicker: 'Temporal Intelligence',
        title: changeResult ? 'Change analysis workspace' : 'Change watch console',
        description: 'Review before-and-after scenes in a dedicated comparison flow instead of mixing temporal analysis with single-scene QA.',
      };
    }

    return {
      kicker: 'Streaming Review',
      title: 'Live monitoring console',
      description: 'Keep camera-based monitoring and recorded video processing inside one operator-friendly workspace with fewer competing panels.',
    };
  }, [activeDetectionSection, activeView, changeResult, detectionResult]);

  const metrics = useMemo(() => {
    if (activeView === 'detect') {
      if (!detectionResult) {
        return [
          {
            label: 'Asset classes',
            value: '08',
            detail: 'Buildings, vegetation, roads, water, drains, vehicles, waste, and open space.',
            accent: true,
          },
          {
            label: 'Workspace pages',
            value: DETECTION_WORKSPACE_NAV.length,
            detail: 'Each downstream task lives on its own focused review surface.',
          },
          {
            label: 'Accepted media',
            value: 'JPG + TIFF',
            detail: 'Still imagery upload supports standard image files and GeoTIFF scenes.',
          },
          {
            label: 'Delivery paths',
            value: 'GIS + PDF',
            detail: 'Exports, reporting, height estimation, and registry handoff are all retained.',
          },
        ];
      }

      return [
        {
          label: 'Total assets',
          value: detectionResult.total_detections,
          detail: 'All detections surfaced by the current hybrid model pass.',
          accent: true,
        },
        {
          label: 'Visible now',
          value: visibleDetectionsCount,
          detail: `Filtered by ${Math.round(confidenceThreshold * 100)}% confidence and category visibility.`,
        },
        {
          label: 'Spatial mode',
          value: hasGeoData ? 'GIS' : 'PIXEL',
          detail: hasGeoData ? 'Geo overlays and map review are ready.' : 'Overlay-first review is active.',
        },
        {
          label: 'Job reference',
          value: jobId ? jobId.slice(0, 8) : 'Pending',
          detail: 'All exports and reports stay tied to this scan session.',
        },
      ];
    }

    if (activeView === 'change') {
      if (!changeResult) {
        return [
          {
            label: 'Inputs',
            value: '02',
            detail: 'Earlier and recent imagery enter the same change-review flow.',
            accent: true,
          },
          {
            label: 'Output',
            value: 'HEATMAP',
            detail: 'Generate a visual change map plus ranked region summaries.',
          },
          {
            label: 'Review mode',
            value: changeLoading ? 'RUNNING' : 'READY',
            detail: changeLoading ? 'The pair is currently being analyzed.' : 'Upload both scenes to begin.',
          },
          {
            label: 'Use case',
            value: 'TRIAGE',
            detail: 'Best for material site shifts, land-use change, and temporal anomalies.',
          },
        ];
      }

      return [
        {
          label: 'Area changed',
          value: `${changeResult.change_percentage}%`,
          detail: 'Estimated share of the scene flagged by the analysis pipeline.',
          accent: true,
        },
        {
          label: 'Regions',
          value: changeResult.total_change_regions,
          detail: 'Flagged zones prioritized for follow-up review.',
        },
        {
          label: 'Similarity',
          value: `${(changeResult.ssim_score * 100).toFixed(1)}%`,
          detail: 'High-level structural similarity between the two scenes.',
        },
        {
          label: 'Summary',
          value: 'READY',
          detail: 'Heatmap, narrative summary, and region list are available together.',
        },
      ];
    }

    return [
      {
        label: 'Modes',
        value: '02',
        detail: 'Switch between live camera review and recorded video processing.',
        accent: true,
      },
      {
        label: 'Stream path',
        value: 'WS',
        detail: 'Live frames route through the WebSocket inference pipeline.',
      },
      {
        label: 'Recorded output',
        value: 'MP4',
        detail: 'Processed videos can be downloaded as annotated exports.',
      },
      {
        label: 'Operator goal',
        value: 'MONITOR',
        detail: 'Stay focused on motion-based awareness without leaving the console.',
      },
    ];
  }, [
    activeView,
    changeLoading,
    changeResult,
    confidenceThreshold,
    detectionResult,
    hasGeoData,
    jobId,
    visibleDetectionsCount,
  ]);

  const statusLabel = useMemo(() => {
    if (activeView === 'detect') {
      if (isLoading) return 'Analyzing imagery';
      if (error) return 'Attention needed';
      if (detectionResult) return `${visibleDetectionsCount} visible detections`;
      return 'Ready for upload';
    }

    if (activeView === 'change') {
      if (changeLoading) return 'Analyzing image pair';
      if (changeResult) return `${changeResult.total_change_regions} change regions ready`;
      return 'Waiting for before and after imagery';
    }

    return 'Live and recorded workflows available';
  }, [activeView, changeLoading, changeResult, detectionResult, error, isLoading, visibleDetectionsCount]);

  const renderedDate = useMemo(() => (
    new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date())
  ), []);

  return (
    <div className="app-shell">
      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <div className="dashboard-brand">
            <div className="dashboard-brand-mark">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="dashboard-brand-kicker">GeoDetect</p>
              <h1 className="dashboard-brand-title">Urban asset command</h1>
            </div>
          </div>

          <div className="dashboard-nav-section">
            <p className="dashboard-section-label">Modes</p>
            <div className="dashboard-nav-stack">
              {MODE_NAV.map((item) => (
                <SidebarButton
                  key={item.key}
                  icon={item.icon}
                  label={item.label}
                  description={item.description}
                  active={activeView === item.key}
                  onClick={() => setActiveView(item.key)}
                />
              ))}
            </div>
          </div>

          {detectionResult && (
            <div className="dashboard-nav-section">
              <p className="dashboard-section-label">Detection Workspace</p>
              <div className="dashboard-nav-stack">
                {DETECTION_WORKSPACE_NAV.map((item) => (
                  <SidebarButton
                    key={item.key}
                    icon={item.icon}
                    label={item.label}
                    description={item.description}
                    active={activeView === 'detect' && activeTab === item.key}
                    badge={item.key === 'map' ? (hasGeoData ? 'GIS' : 'PIXEL') : null}
                    onClick={() => {
                      setActiveView('detect');
                      setActiveTab(item.key);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="dashboard-support-card">
            <p className="dashboard-support-kicker">
              {detectionResult ? 'Current scan' : 'Workflow posture'}
            </p>
            <h2 className="dashboard-support-title">
              {detectionResult ? `${detectionResult.total_detections} assets surfaced` : 'Everything stays in one flow'}
            </h2>
            <p className="dashboard-support-copy">
              {detectionResult
                ? (imageUrl
                  ? 'Use the command deck to branch into visual QA, GIS review, exports, reporting, or DIGIT handoff without losing context.'
                  : 'The session is active and ready for specialist review pages.')
                : 'Upload imagery once, then move through review, analytics, exports, reporting, and governance tasks without rework.'}
            </p>
            {(detectionResult || imageUrl || changeResult) && (
              <button onClick={resetAll} className="dashboard-support-button">
                <RefreshCcw size={14} />
                Start fresh
              </button>
            )}
          </div>
        </aside>

        <div className="dashboard-main">
          <header className="dashboard-topbar">
            <div className="dashboard-search-wrap">
              <form onSubmit={handleSearchSubmit} className="dashboard-search-form">
                <Search size={16} className="dashboard-search-icon" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search scans, controls, exports, or live tools"
                  className="dashboard-search-input"
                />
              </form>

              {searchResults.length > 0 && (
                <div className="dashboard-search-results">
                  {searchResults.map((item) => (
                    <SearchResult
                      key={item.id}
                      label={item.label}
                      description={item.description}
                      onClick={() => handleSearchNavigate(item)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="dashboard-topbar-side">
              <div className="dashboard-status-chip">
                <Activity size={13} />
                {statusLabel}
              </div>

              <div className="dashboard-profile-card">
                <div className="dashboard-profile-avatar">
                  <Layers size={16} />
                </div>
                <div>
                  <p className="dashboard-profile-name">Urban Ops Desk</p>
                  <p className="dashboard-profile-meta">{renderedDate}</p>
                </div>
              </div>
            </div>
          </header>

          <main className="dashboard-pane">
            <section className="dashboard-intro">
              <div>
                <p className="dashboard-eyebrow">{intro.kicker}</p>
                <h2 className="dashboard-title">{intro.title}</h2>
                <p className="dashboard-copy">{intro.description}</p>
              </div>

              <div className="dashboard-intro-actions">
                {activeView === 'detect' && !detectionResult && (
                  <button
                    onClick={() => document.getElementById('image-upload-dropzone')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                    className="btn-primary inline-flex items-center gap-2 text-xs"
                  >
                    <LayoutDashboard size={14} />
                    Start with imagery
                  </button>
                )}

                {activeView === 'detect' && detectionResult && (
                  <button onClick={() => setActiveTab('review')} className="btn-primary inline-flex items-center gap-2 text-xs">
                    <ScanSearch size={14} />
                    Open review canvas
                  </button>
                )}

                {(detectionResult || imageUrl || changeResult) && (
                  <button onClick={resetAll} className="btn-ghost inline-flex items-center gap-2 text-xs">
                    <RefreshCcw size={14} />
                    Reset session
                  </button>
                )}
              </div>
            </section>

            <section className="dashboard-metric-grid">
              {metrics.map((metric) => (
                <DashboardMetric
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  detail={metric.detail}
                  accent={metric.accent}
                />
              ))}
            </section>

            <section className="dashboard-content">
              {activeView === 'detect' && (
                <div className="space-y-5">
                  {!detectionResult && !isLoading && (
                    <div className="animate-fade-in">
                      <ImageUploader />
                    </div>
                  )}

                  {isLoading && (
                    <div className="glass-card p-8 animate-fade-in">
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative h-24 w-24">
                          <div className="absolute inset-0 rounded-[26px] border border-brand-300/40" />
                          <div className="absolute inset-3 rounded-[20px] border border-brand-200/30 animate-pulse" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <LayoutDashboard className="h-8 w-8 text-brand-300 animate-float" />
                          </div>
                        </div>
                        <div className="space-y-1 text-center">
                          <p className="text-sm font-semibold text-surface-100">Analyzing aerial imagery...</p>
                          <p className="text-xs text-surface-300/70">
                            Blending specialist detection models with land-cover analysis for a cleaner review pass.
                          </p>
                        </div>
                        <div className="shimmer h-1.5 w-72 rounded-full" />
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="glass-card border-red-500/30 p-5 animate-fade-in">
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-red-500/10 p-2.5 text-red-300">!</div>
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-red-300">Detection failed</p>
                          <p className="text-xs leading-6 text-surface-300/80">{error}</p>
                          <button onClick={resetAll} className="btn-ghost mt-1 text-xs text-red-300">
                            Reset and try again
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {detectionResult && (
                    <div className="animate-slide-up">
                      <DetectionWorkspace hasGeoData={hasGeoData} />
                    </div>
                  )}
                </div>
              )}

              {activeView === 'change' && <ChangeWorkspace />}
              {activeView === 'live' && <LiveWorkspace />}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
