import React, { useState, useCallback, useMemo } from 'react';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Point } from './models/shared.ts';
import Sidebar from './components/Sidebar/Sidebar.tsx';
import MapHtmlLayers from './components/MapHtmlLayers/MapHtmlLayers.tsx';

import { registerIdbProtocol } from './utils/mapProtocol';

import { useMapStyle } from './hooks/useMapStyle.ts';

import { useMapCache } from './hooks/useMapCache.ts';

import { useRoute } from './hooks/useRoute';

import { useMaps } from './hooks/useMaps';

import type { BoatSettings, RoutingProfile } from './utils/parameters';

import './styles/ui.css';



registerIdbProtocol();

const DEFAULT_BOAT: BoatSettings = {

  variant: 'base',

  load: 'medium',

  fuelLiters: 120,

};



const App: React.FC = () => {
  const [pointA, setPointA] = useState<Point | null>(null);
  const [pointB, setPointB] = useState<Point | null>(null);
  const [activeButton, setActiveButton] = useState<'A' | 'B' | null>(null);

  const [profile, setProfile] = useState<RoutingProfile>('safe');

  const [boat, setBoat] = useState<BoatSettings>(DEFAULT_BOAT);

  const [panelOpen, setPanelOpen] = useState(false);



  const { maps, selectedMapId, setSelectedMapId } = useMaps();

  const selectedMap = useMemo(

    () => maps.find(m => m.id === selectedMapId) ?? null,

    [maps, selectedMapId],

  );



  const { styleJson, mapReady, isOffline, viewState, onOfflineReady } = useMapStyle(

    selectedMapId,

    selectedMap?.pmtiles_url ?? null,

  );

  const { downloadMap, progress, isDownloading } = useMapCache(

    selectedMapId,

    selectedMap?.pmtiles_url ?? null,

    onOfflineReady,

  );



  const {

    route,

    buildRoute,

    clearRoute,

    routeStatus,

    routeStatusType,

    routeSummary,

    isSyncing,

    syncGraph,

    graphCenter,

    graphGeoJson,

    graphNodeCount,

  } = useRoute(selectedMapId);



  const handlePointAdded = (key: 'A' | 'B', newPoint: Point) => {
    const setter = key === 'A' ? setPointA : setPointB;
    setter(newPoint);
    setActiveButton(null);
    clearRoute();
  };

  const handleRemove = (key: 'A' | 'B') => {
    const setter = key === 'A' ? setPointA : setPointB;
    setter(null);
    clearRoute();
  };



  const handleMapChange = (id: number) => {

    setSelectedMapId(id);

    setPointA(null);

    setPointB(null);

    setActiveButton(null);

    clearRoute();

  };



  const handleBuildRoute = () => {

    buildRoute(pointA, pointB, profile, boat);

    setPanelOpen(true);

  };



  const handleSyncGraph = useCallback(() => {
    if (selectedMapId) syncGraph(selectedMapId);
  }, [selectedMapId, syncGraph]);

  const mapCenter = graphCenter

    ? { longitude: graphCenter.lng, latitude: graphCenter.lat, zoom: viewState.zoom }

    : viewState;



  const renderMap = () => {

    if (!selectedMap) {

      return <div className="map-placeholder">Нет карт</div>;

    }



    if (!mapReady || isDownloading) {

      return (

        <div className="map-placeholder">

          <span>{isDownloading ? `Кэш ${progress?.current}/${progress?.total}` : 'Загрузка карты…'}</span>

        </div>

      );

    }



    return (

      <Map

        key={`${selectedMapId}-${isOffline}`}

        renderWorldCopies={false}

        initialViewState={mapCenter}

        style={{ width: '100%', height: '100%' }}

        mapStyle={styleJson as never}
      >
        <MapHtmlLayers
          graphGeoJson={graphGeoJson}
          route={route}
          pointA={pointA}
          pointB={pointB}
          pendingKey={activeButton}
          onPointAdded={handlePointAdded}
        />
      </Map>

    );

  };



  return (

    <div className="app-shell">

      <div className="map-area">

        {renderMap()}

        {!panelOpen && (

          <button

            type="button"

            className="panel-toggle"

            onClick={() => setPanelOpen(true)}

            aria-label="Открыть панель"

          >

            ☰

          </button>

        )}

      </div>



      <div className={`sidebar-overlay ${panelOpen ? 'sidebar-overlay--open' : ''}`}>

        <Sidebar

          maps={maps}

          selectedMapId={selectedMapId}

          onMapChange={handleMapChange}

          activeButton={activeButton}

          onSetPointA={() => { setActiveButton('A'); setPanelOpen(false); }}
          onSetPointB={() => { setActiveButton('B'); setPanelOpen(false); }}

          pointA={pointA}

          pointB={pointB}

          onRemoveA={() => handleRemove('A')}

          onRemoveB={() => handleRemove('B')}

          profile={profile}

          onProfileChange={setProfile}

          boat={boat}

          onBoatChange={setBoat}

          onDownloadMap={downloadMap}

          isDownloading={isDownloading}

          downloadProgress={progress}

          onBuildRoute={handleBuildRoute}

          canBuildRoute={!!pointA && !!pointB && !isSyncing && graphGeoJson !== null}

          routeStatus={routeStatus}

          routeStatusType={routeStatusType}

          routeSummary={routeSummary}

          isSyncing={isSyncing}

          onSyncGraph={handleSyncGraph}

          isOffline={isOffline}

          graphNodeCount={graphNodeCount}

          onClose={() => setPanelOpen(false)}

        />

      </div>

    </div>

  );

};



export default App;


