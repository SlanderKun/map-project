import React from 'react';

const ToolBar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ zIndex: 1, gap: 6, display: 'flex', flexDirection: 'column', width: 200 }}>
    {children}
  </div>
);

export default ToolBar