import React from 'react';
import { OSWindow } from '../../lib/ui-framework/OSWindow';
import { GitVFSTest } from '../GitVFSTest';
import { DynamicImportTest } from '../DynamicImportTest';
import { AgentDelegatorTest } from '../AgentDelegatorTest';
import { Activity } from 'lucide-react';

export const ScreenLegacyTests: React.FC = () => {
  return (
    <OSWindow title="System Core Tests" state="idle" className="h-full" icon={<Activity />}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 h-full overflow-y-auto p-1 pb-24 overscroll-contain">
        
        <div className="border border-slate-800 rounded bg-slate-900/50 p-1">
          <GitVFSTest />
        </div>
        
        <div className="border border-slate-800 rounded bg-slate-900/50 p-1">
          <DynamicImportTest />
        </div>

        <div className="border border-slate-800 rounded bg-slate-900/50 p-1">
          <AgentDelegatorTest />
        </div>
      </div>
    </OSWindow>
  );
};
