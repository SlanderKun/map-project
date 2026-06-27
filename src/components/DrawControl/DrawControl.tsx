import { useEffect, useRef } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import { TerraDraw, TerraDrawPointMode } from 'terra-draw';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';
import type { Point, PointKey } from './../../models/shared.ts';


interface Props {
  drawRef: React.RefObject<TerraDraw | null>;
  pendingKey: PointKey | null;
  pointA: Point | null;
  pointB: Point | null;
  onPointAdded: (key: PointKey, point: Point) => void;
  onPointPlaced: () => void;
}

const DrawControl: React.FC<Props> = ({ drawRef, pendingKey, pointA, pointB, onPointAdded, onPointPlaced }) => {
  const { current: map } = useMap();
  const pendingKeyRef = useRef<PointKey | null>(pendingKey);

  useEffect(() => {
    pendingKeyRef.current = pendingKey;
  }, [pendingKey]);

  useEffect(() => {
    if (!map) return;
    const nativeMap = map.getMap();

    const init = () => {
      const draw = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({ map: nativeMap }),
        modes: [new TerraDrawPointMode()],
      });

      draw.start();
      drawRef.current = draw;

      nativeMap.addSource('point-labels', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      nativeMap.addLayer({
        id: 'point-labels',
        type: 'symbol',
        source: 'point-labels',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 14,
          'text-offset': [0, -1.5],
          'text-anchor': 'bottom',
        },
        paint: {
          'text-color': '#000',
          'text-halo-color': '#fff',
          'text-halo-width': 2,
        },
      });

      draw.on('change', (ids, type) => {
        if (type === 'create' && pendingKeyRef.current) {
          const snapshot = draw.getSnapshot();
          const created = snapshot.find(f => String(f.id) === String(ids[0]));
          if (created && created.geometry.type === 'Point') {
            const point: Point = {
              id: String(created.id),
              lng: (created.geometry as GeoJSON.Point).coordinates[0],
              lat: (created.geometry as GeoJSON.Point).coordinates[1],
            };
            onPointAdded(pendingKeyRef.current, point);
            onPointPlaced();
            draw.setMode('static');
          }
        }
      });
    };

    if (nativeMap.isStyleLoaded()) {
      init();
    } else {
      nativeMap.once('style.load', init);
    }

    return () => {
      nativeMap.off('style.load', init);
      if (drawRef.current) {
        drawRef.current.stop();
        drawRef.current = null;
      }
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;
    const nativeMap = map.getMap();
    const source = nativeMap.getSource('point-labels') as maplibregl.GeoJSONSource;
    if (!source) return;

    const features = [
      pointA && { type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [pointA.lng, pointA.lat] }, properties: { label: 'A' } },
      pointB && { type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [pointB.lng, pointB.lat] }, properties: { label: 'B' } },
    ].filter(Boolean);

    source.setData({ type: 'FeatureCollection', features });
  }, [pointA, pointB]);

  return null;
};

export default DrawControl;