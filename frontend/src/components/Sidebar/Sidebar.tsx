import React from 'react';

import type { ApiMap } from '../../http/apiRequests';

import type { Point } from '../../models/shared';

import type { BoatSettings, RoutingProfile } from '../../utils/parameters';

import { PROFILE_LABELS, ROUTING_PROFILES } from '../../utils/parameters';

import type { RouteSummary } from '../../utils/routeMetrics';



interface SidebarProps {

  maps: ApiMap[];

  selectedMapId: number | null;

  onMapChange: (id: number) => void;

  activeButton: 'A' | 'B' | null;

  onSetPointA: () => void;

  onSetPointB: () => void;

  pointA: Point | null;

  pointB: Point | null;

  onRemoveA: () => void;

  onRemoveB: () => void;

  profile: RoutingProfile;

  onProfileChange: (p: RoutingProfile) => void;

  boat: BoatSettings;

  onBoatChange: (b: BoatSettings) => void;

  onDownloadMap: () => void;

  isDownloading: boolean;

  downloadProgress: { current: number; total: number } | null;

  onBuildRoute: () => void;

  canBuildRoute: boolean;

  routeStatus: string | null;

  routeStatusType: 'idle' | 'success' | 'error';

  routeSummary: RouteSummary | null;

  isSyncing: boolean;

  onSyncGraph: () => void;

  isOffline: boolean;
  graphNodeCount: number;
  onClose: () => void;

}



const Sidebar: React.FC<SidebarProps> = ({

  maps,

  selectedMapId,

  onMapChange,

  activeButton,

  onSetPointA,

  onSetPointB,

  pointA,

  pointB,

  onRemoveA,

  onRemoveB,

  profile,

  onProfileChange,

  boat,

  onBoatChange,

  onDownloadMap,

  isDownloading,

  downloadProgress,

  onBuildRoute,

  canBuildRoute,

  routeStatus,

  routeStatusType,

  routeSummary,

  isSyncing,

  onSyncGraph,

  isOffline,

  graphNodeCount,

  onClose,

}) => (

  <aside className="sidebar">

    <div className="sidebar__header">

      <span className="sidebar__title">Raptor 650</span>

      <button type="button" className="sidebar__close" onClick={onClose} aria-label="Закрыть">

        ×

      </button>

    </div>



    <div className="sidebar__body">

      <div className="section-label">Карта {isOffline ? '· офлайн' : '· онлайн'}</div>

      <select

        className="select"

        value={selectedMapId ?? ''}

        onChange={e => onMapChange(Number(e.target.value))}

      >

        {maps.length === 0 && <option value="">Нет карт</option>}

        {maps.map(m => (

          <option key={m.id} value={m.id}>{m.name}</option>

        ))}

      </select>



      <button className="btn" onClick={onDownloadMap} disabled={isDownloading}>

        {isDownloading && downloadProgress

          ? `Кэш ${downloadProgress.current}/${downloadProgress.total}`

          : 'Сохранить офлайн'}

      </button>



      <button className="btn" onClick={onSyncGraph} disabled={isSyncing || !selectedMapId}>
        {isSyncing ? 'Синхр…' : `Синхр. граф (${graphNodeCount})`}
      </button>



      <div className="divider" />



      <div className="section-label">Лодка</div>

      <select

        className="select"

        value={boat.variant}

        onChange={e => onBoatChange({ ...boat, variant: e.target.value as BoatSettings['variant'] })}

      >

        <option value="base">Без поддува</option>

        <option value="inflatable">С поддувом</option>

      </select>

      <select

        className="select"

        value={boat.load}

        onChange={e => onBoatChange({ ...boat, load: e.target.value as BoatSettings['load'] })}

      >

        <option value="light">Лёгкая загрузка</option>

        <option value="medium">Средняя</option>

        <option value="heavy">Тяжёлая</option>

      </select>

      <label className="field-row">

        <span>Топливо, л</span>

        <input

          className="input-num"

          type="number"

          min={10}

          max={500}

          value={boat.fuelLiters}

          onChange={e => onBoatChange({ ...boat, fuelLiters: Number(e.target.value) })}

        />

      </label>



      <div className="divider" />



      <div className="section-label">Точки</div>

      <div className="btn-row">

        <button

          className={`btn ${activeButton === 'A' ? 'btn--active' : ''}`}

          onClick={onSetPointA}

        >

          {activeButton === 'A' ? 'Клик…' : 'A'}

        </button>

        <button

          className={`btn ${activeButton === 'B' ? 'btn--active' : ''}`}

          onClick={onSetPointB}

        >

          {activeButton === 'B' ? 'Клик…' : 'B'}

        </button>

      </div>

      {pointA && (

        <div className="point-info">

          <span>A: {pointA.lat.toFixed(4)}, {pointA.lng.toFixed(4)}</span>

          <button className="icon-btn" onClick={onRemoveA}>×</button>

        </div>

      )}

      {pointB && (

        <div className="point-info">

          <span>B: {pointB.lat.toFixed(4)}, {pointB.lng.toFixed(4)}</span>

          <button className="icon-btn" onClick={onRemoveB}>×</button>

        </div>

      )}



      <div className="divider" />



      <div className="section-label">Режим</div>

      <div className="profile-grid">

        {ROUTING_PROFILES.map(p => (

          <button

            key={p}

            type="button"

            className={`btn btn--sm ${profile === p ? 'btn--active' : ''}`}

            onClick={() => onProfileChange(p)}

          >

            {PROFILE_LABELS[p]}

          </button>

        ))}

      </div>



      <button

        className="btn btn--primary"

        onClick={onBuildRoute}

        disabled={!canBuildRoute}

      >

        Построить маршрут

      </button>



      {routeStatus && (

        <div className={`status-bar status-bar--${routeStatusType === 'idle' ? '' : routeStatusType}`}>

          {routeStatus}

        </div>

      )}



      {routeSummary && (

        <div className="route-card">

          <div className="route-card__title">Карточка маршрута</div>

          <div className="route-card__row">

            <span>Режим</span>

            <strong>{PROFILE_LABELS[profile]}</strong>

          </div>

          <div className="route-card__row">

            <span>Длина</span>

            <strong>{routeSummary.distanceKm.toFixed(1)} км</strong>

          </div>

          <div className="route-card__row">

            <span>Время</span>

            <strong>{Math.round(routeSummary.timeMin)} мин</strong>

          </div>

          <div className="route-card__row">

            <span>Расход</span>

            <strong>{routeSummary.fuelUsedL.toFixed(1)} л</strong>

          </div>

          <div className="route-card__row">

            <span>Остаток</span>

            <strong>{routeSummary.fuelRemainingL.toFixed(1)} л</strong>

          </div>

          <div className="route-card__row">

            <span>Запас хода</span>

            <strong>{routeSummary.rangeKm.toFixed(0)} км</strong>

          </div>

          <p className="route-card__note">{routeSummary.explanation}</p>

          {routeSummary.warnings.map(w => (

            <div key={w} className="route-card__warn">⚠ {w}</div>

          ))}

        </div>

      )}

    </div>

  </aside>

);



export default Sidebar;


