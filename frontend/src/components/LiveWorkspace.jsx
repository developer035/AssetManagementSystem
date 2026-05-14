import React from 'react';
import { Camera, Film, Radar, ShieldCheck, Video } from 'lucide-react';
import LiveStream from './LiveStream';

function InsightCard({ title, items }) {
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

export default function LiveWorkspace() {
  return (
    <div className="space-y-5">
      <div className="glass-card p-5 md:p-6">
        <div className="flex flex-col gap-4 border-b border-surface-700/18 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-emerald-500/12 p-3 text-emerald-300">
              <Radar className="h-5 w-5" />
            </div>
            <div>
              <p className="panel-kicker mb-1">Live operations console</p>
              <h3 className="font-display text-xl font-semibold tracking-[-0.03em] text-white">
                Keep the monitoring surface centered and let the support details stay secondary.
              </h3>
            </div>
          </div>
          <div className="subtle-badge">
            <Video size={12} />
            Live + recorded modes
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            ['Modes', '02'],
            ['Outputs', 'HUD + MP4'],
            ['Use', 'Monitor'],
          ].map(([label, value]) => (
            <div key={label} className="metric-card">
              <p className="panel-kicker mb-2">{label}</p>
              <p className="text-2xl font-semibold tracking-[-0.04em] text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card-static p-5 md:p-6">
        <div className="mb-4 flex flex-col gap-3 border-b border-surface-700/18 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="panel-kicker mb-1">Main console</p>
            <p className="text-sm font-semibold text-white">
              Switch between live monitoring and recorded video processing without leaving the same operator surface.
            </p>
          </div>
          <div className="subtle-badge">
            <Camera size={12} />
            Stream and upload
          </div>
        </div>
        <LiveStream />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="glass-card p-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-500/12 p-2.5 text-emerald-300">
              <Camera size={18} />
            </div>
            <div>
              <p className="panel-kicker mb-1">Live camera mode</p>
              <p className="text-sm font-semibold text-white">Best for awareness and quick response.</p>
            </div>
          </div>
          <p className="text-xs leading-6 text-surface-200/74">
            Use the live mode when you want immediate feedback and can tolerate normal motion, lighting, and connection variability.
          </p>
        </div>

        <div className="glass-card p-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-500/12 p-2.5 text-cyan-300">
              <Film size={18} />
            </div>
            <div>
              <p className="panel-kicker mb-1">Recorded video mode</p>
              <p className="text-sm font-semibold text-white">Best for stable review and shareable outputs.</p>
            </div>
          </div>
          <p className="text-xs leading-6 text-surface-200/74">
            Use upload mode when you need sampled frame analysis, category totals, and an annotated MP4 that can move downstream.
          </p>
        </div>

        <InsightCard
          title="Operator habits"
          items={[
            'Keep confidence conservative in live mode so the HUD stays readable.',
            'Use recorded processing when you want something stable enough to share or archive.',
            'Treat live as awareness and upload mode as documentation plus follow-up analysis.',
          ]}
        />

        <InsightCard
          title="Where it fits"
          items={[
            'Use this page for motion-based monitoring rather than single-scene forensic review.',
            'Still-image detection remains better for curated exports, reporting, and deep visual QA.',
            'Recorded video is the best bridge between field capture and office-side review.',
          ]}
        />

        <div className="glass-card p-5 xl:col-span-2">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-2xl bg-teal-500/12 p-2.5 text-teal-300">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="panel-kicker mb-1">Console philosophy</p>
              <p className="text-sm font-semibold text-white">The feed stays central. Guidance stays compact.</p>
            </div>
          </div>
          <p className="text-xs leading-6 text-surface-200/74">
            This layout intentionally keeps the operational surface dominant and moves the explanation into tighter support cards
            below it, so the page feels structured around the console instead of buried in long narrative sections.
          </p>
        </div>
      </div>
    </div>
  );
}
