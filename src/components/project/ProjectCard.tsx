import React from 'react';
import { motion } from 'framer-motion';
import {
  FolderGit2,
  GitBranch,
  Calendar,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Project } from '../../types';

interface ProjectCardProps {
  project: Project;
  isSelected: boolean;
  onSelect: (projectId: string) => void;
  index?: number;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  isSelected,
  onSelect,
  index = 0,
}) => {
  const getStatusBadge = () => {
    switch (project.status) {
      case 'COMPLETED':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
          label: 'Completed',
          className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
        };
      case 'EXECUTING':
        return {
          icon: <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />,
          label: 'In Execution',
          className: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
        };
      case 'BLOCKED':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />,
          label: 'Blocked / Error',
          className: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
        };
      default:
        return {
          icon: <Clock className="w-3.5 h-3.5 text-slate-400" />,
          label: 'Planning',
          className: 'bg-slate-800 text-slate-300 border-slate-700',
        };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 24,
        delay: Math.min(index * 0.05, 0.3),
      }}
      whileHover={{
        y: -3,
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.985 }}
      onClick={() => onSelect(project.id)}
      className={`group relative rounded-2xl p-5 border cursor-pointer select-none transition-shadow ${
        isSelected
          ? 'bg-[#101728] border-indigo-500 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500/40'
          : 'bg-[#0e1422] border-slate-800/90 hover:border-slate-700/90 hover:shadow-lg hover:shadow-black/40'
      }`}
    >
      {/* Active Selected Glow Accent */}
      {isSelected && (
        <motion.div
          layoutId="selectedProjectGlow"
          className="absolute -inset-px rounded-2xl border-2 border-indigo-500 pointer-events-none"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}

      {/* Card Header: Icon, Name & Status Pill */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
              isSelected
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                : 'bg-indigo-950/30 border-indigo-900/40 text-indigo-400 group-hover:border-indigo-700/50'
            }`}
          >
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm group-hover:text-indigo-200 transition-colors leading-snug">
              {project.name}
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 mt-0.5">
              <GitBranch className="w-3 h-3 text-indigo-400 shrink-0" />
              <span className="truncate max-w-[170px]">{project.activeBranch || 'main'}</span>
            </div>
          </div>
        </div>

        {/* Animated Status Pill */}
        <motion.div
          key={project.status}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium font-mono shrink-0 ${statusBadge.className}`}
        >
          {statusBadge.icon}
          <span>{statusBadge.label}</span>
        </motion.div>
      </div>

      {/* Description */}
      {project.description ? (
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
          {project.description}
        </p>
      ) : (
        <p className="text-xs text-slate-600 italic mb-4">No description provided.</p>
      )}

      {/* Card Footer: Metadata & Open action */}
      <div className="pt-3 border-t border-slate-800/70 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <Calendar className="w-3 h-3 text-slate-500" />
          <span>
            {new Date(project.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-500">Base: {project.defaultBranch || 'main'}</span>
        </div>

        <div className="flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors">
          <span>{isSelected ? 'Active' : 'Open'}</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </motion.div>
  );
};
