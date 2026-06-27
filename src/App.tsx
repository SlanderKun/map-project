import React, { useRef, useState } from 'react';
import { Map } from 'react-map-gl/maplibre';
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
import { useMapStyle } from './hooks/useMapStyle';
import { useMapCache } from './hooks/useMapCache.ts';

registerIdbProtocol();

const App: React.FC = () => {
  const drawRef = useRef<TerraDraw | null>(null);
  const [pointA, setPointA] = useState<Point | null>(null);
  const [pointB, setPointB] = useState<Point | null>(null);
  const [activeButton, setActiveButton] = useState<'A' | 'B' | null>(null);
  const { styleJson, isCached, onDownloaded } = useMapStyle();
  const { downloadMap, progress, isDownloading } = useMapCache(onDownloaded);

  const handlePointAdded = (key: 'A' | 'B', newPoint: Point) => {
    const setter = key === 'A' ? setPointA : setPointB;
    setter(prev => {
      if (prev && drawRef.current) {
        try { drawRef.current.removeFeatures([prev.id]); } catch {}
      }
      return newPoint;
    });
    setActiveButton(null);
  };

  const handleRemove = (key: 'A' | 'B') => {
    const setter = key === 'A' ? setPointA : setPointB;
    setter(prev => {
      if (prev && drawRef.current) {
        try { drawRef.current.removeFeatures([prev.id]); } catch {}
      }
      return null;
    });
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

          <button onClick={downloadMap} disabled={isDownloading}>
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