import { useEffect, useState } from 'react';
import { db } from '../db/dexieDb';

const STYLE_ID = 'default';

export function useMapStyle() {
  const [styleJson, setStyleJson] = useState<object | null>(null);
  const [isCached, setIsCached] = useState<boolean | null>(null);

  useEffect(() => {
    async function load() {
      const style = await db.styles.get(STYLE_ID);
      // БАГ 3 FIX: проверяем оба условия — стиль есть И тайлы загружены
      const meta = await db.meta.get('tilesReady');
      const ready = !!(style && meta?.value);

      setIsCached(ready);
      if (ready) {
        setStyleJson(style!.json);
      }
    }
    load();
  }, []);

  function onDownloaded(json: object) {
    setStyleJson(json);
    setIsCached(true);
  }

  return { styleJson, isCached, onDownloaded };
}