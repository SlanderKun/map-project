import React, { useRef, useState } from 'react';
import { Map, Source, Layer } from 'react-map-gl/maplibre';
import type { LineLayerSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { TerraDraw } from 'terra-draw';
import type { Point } from './models/shared.ts';
import PointInfo from './components/PointInfo/PointInfo.tsx';
import DrawControl from './components/DrawControl/DrawControl.tsx';
import ToolBar from './components/ToolBar/ToolBar';
import PointButton from './components/PointButton/PointButton';
import Header from './components/Header/Header.tsx';
import PointButtonWrapper from './components/PointButtonWrapper/PointButtonWrapper.tsx';
import { registerIdbProtocol } from './utils/mapProtocol';
import { useMapStyle } from './hooks/useMapStyle.ts';
import { useMapCache } from './hooks/useMapCache.ts';
import { useRoute } from './hooks/useRoute';
import type { RoutingProfile } from './utils/parameters';

registerIdbProtocol();

const ROUTE_LAYER: LineLayerSpecification = {
  id: 'route',
  type: 'line',
  source: 'route',
  layout: { 'line-join': 'round', 'line-cap': 'round' },
  paint: { 'line-color': '#e74c3c', 'line-width': 4, 'line-opacity': 0.9 },
};

const App: React.FC = () => {
  const drawRef = useRef<TerraDraw | null>(null);
  const [pointA, setPointA] = useState<Point | null>(null);
  const [pointB, setPointB] = useState<Point | null>(null);
  const [activeButton, setActiveButton] = useState<'A' | 'B' | null>(null);
  const [profile, setProfile] = useState<RoutingProfile>('safe');
  const { styleJson, isCached, onDownloaded } = useMapStyle();
  const { downloadMap, progress, isDownloading } = useMapCache(onDownloaded);
  const { route } = useRoute(pointA, pointB, profile);

  const safeRemoveFeature = (id: string) => {
    const draw = drawRef.current;
    if (!draw) return;
    const exists = draw.getSnapshot().some(f => f.id === id);
    if (exists) draw.removeFeatures([id]);
  };

  const handlePointAdded = (key: 'A' | 'B', newPoint: Point) => {
    const setter = key === 'A' ? setPointA : setPointB;
    setter(prev => {
      if (prev) safeRemoveFeature(prev.id);
      return newPoint;
    });
    setActiveButton(null);
  };

  const handleRemove = (key: 'A' | 'B') => {
    const setter = key === 'A' ? setPointA : setPointB;
    setter(prev => {
      if (prev) safeRemoveFeature(prev.id);
      return null;
    });
  };

  // GeoJSON для LineLayer маршрута
  const routeGeoJson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: route.length > 1
      ? [{
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: route.map(c => [c.lng, c.lat]),
          },
          properties: {},
        }]
      : [],
  };

  const renderMap = () => {
    if (isCached === null) return null;

    if (!isCached || isDownloading) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          {isDownloading
            ? `Загрузка ${progress?.current}/${progress?.total}...`
            : 'Карта не загружена'}
        </div>
      );
    }

    return (
      <Map
        renderWorldCopies={true}
        initialViewState={{ longitude: 4.9, latitude: 52.37, zoom: 11 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={styleJson as any}
      >
        <DrawControl
          drawRef={drawRef}
          pendingKey={activeButton}
          pointA={pointA}
          pointB={pointB}
          onPointAdded={handlePointAdded}
          onPointPlaced={() => setActiveButton(null)}
        />

        {/* Маршрут */}
        <Source id="route" type="geojson" data={routeGeoJson}>
          <Layer {...ROUTE_LAYER} />
        </Source>
      </Map>
    );
  };

  return (
    <>
      <Header />
      <main style={{ height: 'calc(100vh - 50px)', display: 'flex' }}>
        <ToolBar>
          <PointButtonWrapper>
            <PointButton
              label={activeButton === 'A' ? 'Кликните на карту…' : 'Точка A'}
              isActive={activeButton === 'A'}
              onRemove={() => { setActiveButton('A'); drawRef.current?.setMode('point'); }}
            />
            {pointA && (
              <PointInfo label="A" lng={pointA.lng} lat={pointA.lat} onRemove={() => handleRemove('A')} />
            )}
          </PointButtonWrapper>

          <PointButtonWrapper>
            <PointButton
              label={activeButton === 'B' ? 'Кликните на карту…' : 'Точка B'}
              isActive={activeButton === 'B'}
              onRemove={() => { setActiveButton('B'); drawRef.current?.setMode('point'); }}
            />
            {pointB && (
              <PointInfo label="B" lng={pointB.lng} lat={pointB.lat} onRemove={() => handleRemove('B')} />
            )}
          </PointButtonWrapper>

          {/* Переключатель профиля */}
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            <button
              onClick={() => setProfile('safe')}
              disabled={profile === 'safe'}
              style={{ flex: 1, fontWeight: profile === 'safe' ? 'bold' : 'normal' }}
            >
              Safe
            </button>
            <button
              onClick={() => setProfile('fast')}
              disabled={profile === 'fast'}
              style={{ flex: 1, fontWeight: profile === 'fast' ? 'bold' : 'normal' }}
            >
              Fast
            </button>
          </div>

          <button onClick={downloadMap} disabled={isDownloading} style={{ marginTop: 8 }}>
            {isDownloading
              ? `Загрузка ${progress?.current}/${progress?.total}...`
              : 'Обновить карту'}
          </button>
        </ToolBar>

        <div style={{ width: 'calc(100vw - 200px)', height: '100%', position: 'relative' }}>
          {renderMap()}
        </div>
      </main>
    </>
  );
};

export default App;