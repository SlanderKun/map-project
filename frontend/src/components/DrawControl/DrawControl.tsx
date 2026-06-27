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

const SOURCE_ID = 'point-labels';

const DrawControl: React.FC<Props> = ({ drawRef, pendingKey, pointA, pointB, onPointAdded, onPointPlaced }) => {
  const { current: map } = useMap();
  const pendingKeyRef = useRef<PointKey | null>(pendingKey);
  // FIX 3: track whether our source/layer have been added yet
  const readyRef = useRef(false);

  useEffect(() => {
    pendingKeyRef.current = pendingKey;
  }, [pendingKey]);

  useEffect(() => {
    if (!map) return;
    const nativeMap = map.getMap();

    const init = () => {
      if (drawRef.current) return;

      const draw = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({ map: nativeMap }),
        modes: [new TerraDrawPointMode()],
      });

      draw.start();
      drawRef.current = draw;

      nativeMap.addSource(SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      nativeMap.addLayer({
        id: SOURCE_ID,
        type: 'symbol',
        source: SOURCE_ID,
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

      // FIX 3: mark source/layer as ready so the label effect can run
      readyRef.current = true;

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

    nativeMap.once('load', init);
    if (nativeMap.loaded()) init();

    return () => {
      nativeMap.off('load', init);
      readyRef.current = false;
      if (drawRef.current) {
        drawRef.current.stop();
        drawRef.current = null;
      }
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;
    const nativeMap = map.getMap();

    // FIX 3: bail out if source hasn't been added yet — avoids the crash
    if (!readyRef.current) return;

    const source = nativeMap.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
    if (!source) return;

    const features: GeoJSON.Feature[] = [];
    if (pointA) features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [pointA.lng, pointA.lat] }, properties: { label: 'A' } });
    if (pointB) features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [pointB.lng, pointB.lat] }, properties: { label: 'B' } });

    source.setData({ type: 'FeatureCollection', features });
  }, [pointA, pointB]);

  return null;
};

export default DrawControl;