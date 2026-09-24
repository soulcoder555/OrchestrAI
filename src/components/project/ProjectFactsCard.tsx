import React, { useState } from 'react';
import { Database, Plus, Check } from 'lucide-react';
import { ProjectFact } from '../../types';

interface ProjectFactsCardProps {
  facts: ProjectFact[];
  onAddFact: (category: string, key: string, value: string) => Promise<void>;
}

export const ProjectFactsCard: React.FC<ProjectFactsCardProps> = ({ facts, onAddFact }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [category, setCategory] = useState('architecture');
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || !value.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddFact(category, key.trim(), value.trim());
      setKey('');
      setValue('');
      setIsAdding(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0e1420] border border-slate-800/80 rounded-xl p-4.5 mb-6 text-xs">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-slate-200">Project Architectural Facts</span>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
        >
          <Plus className="w-3 h-3" />
          <span>Add Fact</span>
        </button>
      </div>

      {/* Facts list */}
      <div className="space-y-1.5 font-mono text-[11px]">
        {facts.map((fact) => (
          <div key={fact.id} className="flex items-center justify-between p-2 bg-[#090d14] rounded border border-slate-800/60">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-sans uppercase">{fact.category}:</span>
              <span className="text-slate-200">{fact.key}</span>
            </div>
            <span className="text-indigo-300 truncate max-w-[200px]">{fact.value}</span>
          </div>
        ))}
        {facts.length === 0 && (
          <p className="text-slate-400 font-sans text-center py-2">No facts registered yet.</p>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="mt-3 pt-3 border-t border-slate-800/60 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-[#090d14] border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs"
            >
              <option value="architecture">architecture</option>
              <option value="convention">convention</option>
              <option value="security">security</option>
              <option value="tech_stack">tech_stack</option>
            </select>
            <input
              type="text"
              placeholder="key (e.g. crypto)"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="bg-[#090d14] border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs"
            />
            <input
              type="text"
              placeholder="value (e.g. HMAC SHA256)"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="bg-[#090d14] border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-2 py-1 text-slate-400 hover:text-slate-200 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium"
            >
              Save Fact
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
