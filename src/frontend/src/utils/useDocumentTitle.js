import { useEffect } from "react";

const APP_NAME = "Waypoints";

/**
 * Sets the browser tab title to "<title> · Waypoints" while the calling page is mounted.
 * Pass a falsy title (e.g. while data is loading) to show just the app name.
 */
export default function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
    return () => { document.title = APP_NAME; };
  }, [title]);
}
