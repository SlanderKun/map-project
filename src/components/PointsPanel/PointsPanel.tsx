import React from "react";

interface IProps {
  children: React.ReactNode
}

const PointsPanel: React.FC<IProps> = ({ children }) => (
  <div style={{
    position: 'absolute', zIndex: 1, top: 10, right: 10,
    background: '#fff', borderRadius: 6, padding: '10px 14px',
    boxShadow: '0 2px 8px rgba(0,0,0,.2)', minWidth: 220,
  }}>
    {children}
  </div>
);

export default PointsPanel;