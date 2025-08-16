import { useCallback } from "react";

/**
 * Shared logic for toggling expand state and lazily loading photos for an entity.
 * Expects expand and photo caches to be owned by a parent component.
 */
export default function useExpandPhotos({ key, expanded, setExpanded, entityPhotos, setEntityPhotos, fetchPhotos }) {
  const isExpanded = !!expanded[key];
  const photos = entityPhotos[key];

  const toggle = useCallback(async () => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    if (!entityPhotos[key]) {
      try {
        const p = await fetchPhotos();
        setEntityPhotos(prev => ({ ...prev, [key]: p }));
      } catch {}
    }
  }, [key, entityPhotos, fetchPhotos, setEntityPhotos, setExpanded]);

  const refresh = useCallback(async () => {
    try {
      const p = await fetchPhotos();
      setEntityPhotos(prev => ({ ...prev, [key]: p }));
    } catch {}
  }, [key, fetchPhotos, setEntityPhotos]);

  return { isExpanded, photos, toggle, refresh };
}
