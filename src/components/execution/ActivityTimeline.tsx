import React from 'react';
import {
  GitCommit,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  Clock,
  Shield,
} from 'lucide-react';
import { ActivityEvent } from '../../types';

interface ActivityTimelineProps {
  activities: ActivityEvent[];
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities }) => {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'COMMIT_CREATED':
      case 'TASK_APPROVED':
        return <GitCommit className="w-3.5 h-3.5 text-emerald-400" />;
      case 'VALIDATION_PASSED':
      case 'PROJECT_COMPLETED':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'VALIDATION_FAILED':
      case 'TASK_BLOCKED':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
      case 'RETRY_ATTEMPT':
        return <RotateCcw className="w-3.5 h-3.5 text-amber-400" />;
      case 'PLAN_GENERATED':
      case 'AI_CODE_GENERATED':
        return <Sparkles className="w-3.5 h-3.5 text-indigo-400" />;
      case 'REPO_SCANNED':
        return <Layers className="w-3.5 h-3.5 text-blue-400" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="bg-[#0e1420] border border-slate-800/80 rounded-xl p-4.5 text-xs">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/60">
        <span className="font-semibold text-slate-200">Orchestration Activity</span>
        <span className="text-[11px] text-slate-400 font-mono">{activities.length} events</span>
      </div>

      {activities.length === 0 ? (
        <p className="text-slate-400 text-center py-4">No activity logged yet.</p>
      ) : (
        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
          {activities.map((act) => (
            <div key={act.id} className="flex items-start gap-2.5">
              <div className="p-1 rounded bg-[#090d14] border border-slate-800/80 shrink-0 mt-0.5">
                {getEventIcon(act.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-200 text-xs truncate">{act.title}</span>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                {act.details && (
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed truncate">{act.details}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
