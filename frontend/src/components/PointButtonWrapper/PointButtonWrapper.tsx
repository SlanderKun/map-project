import { center } from '@turf/turf';
import React from 'react';

interface IProps {
    children: React.ReactNode
}

const PointButtonWrapper:React.FC<IProps> = ({children}) => {
  return (
    <div style={{width: "100%", height: 100, display: 'flex', alignItems: 'center', gap: 5}}>
      {children}
    </div>
  );
};

export default PointButtonWrapper;