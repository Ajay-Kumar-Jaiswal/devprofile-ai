import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  BarChart2,
  Calendar,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

interface EmptyStateProps {
  onLoadDemo: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onLoadDemo }) => {
  const features = [
    {
      title: 'Deterministic Scoring (0–100)',
      desc: 'Transparent 5-pillar evaluation of documentation hygiene, reach, stack breadth, and freshness.',
      icon: ShieldCheck,
      color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    },
    {
      title: 'Language & Reach Telemetry',
      desc: 'Interactive Recharts breakdown of code distribution and star/fork traction.',
      icon: BarChart2,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    },
    {
      title: 'Repository Hygiene Checklist',
      desc: 'Automated audit of repository descriptions, tech topics, and open-source licenses.',
      icon: CheckCircle,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Placement Action Roadmaps',
      desc: 'Targeted 7-day sprint and 30-day strategic plans formatted for campus interview prep.',
      icon: Calendar,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      {/* Feature grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <div
              key={i}
              className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors"
            >
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${f.color}`}>
                <Icon className="w-5 h-5" />
              </div>

              <div>
                <h3 className="font-bold text-white text-sm sm:text-base">
                  {f.title}
                </h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Demo Callout banner */}
      <div className="mt-8 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-violet-950/40 via-navy-900 to-indigo-950/40 border border-violet-500/30 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-card">
        <div className="space-y-1 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            College Placement Drive Demo
          </div>
          <h4 className="text-lg font-bold text-white">
            Want to see how an audited developer portfolio looks?
          </h4>
          <p className="text-xs sm:text-sm text-slate-300">
            Load our pre-configured demo student profile with sample repositories, metrics, and roadmap.
          </p>
        </div>

        <button
          onClick={onLoadDemo}
          className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-glow-violet active:scale-95"
        >
          <span>Explore Demo Profile</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
