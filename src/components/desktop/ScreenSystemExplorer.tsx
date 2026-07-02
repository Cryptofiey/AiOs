import React from 'react';
import { ShellMatrix } from '../../lib/ui-framework/ShellMatrix';

export const ScreenSystemExplorer: React.FC = () => {
  return (
    <div className="flex-1 w-full h-full p-1">
      <ShellMatrix state="thinking" />
    </div>
  );
};
