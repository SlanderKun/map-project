import React from 'react';

interface Props {
  label: string;
  lng: number;
  lat: number;
  onRemove: () => void;
}

const PointInfo: React.FC<Props> = ({lng, lat}) => (
  <div style={{ fontSize: 13, marginBottom: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
    <div>{lng.toFixed(5)}, {lat.toFixed(5)}</div>
  </div>
);

export default PointInfo;