import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'app.settings.v1';

// Per-browser UI preferences only. Secrets (API keys) belong in the backend .env.
const defaultSettings = {
  theme: 'dark',
  fontScale: 1,
};

const SettingsContext = createContext({
  settings: defaultSettings,
  setTheme: (theme) => {},
  setFontScale: (scale) => {},
});

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // Drop the legacy browser-stored ORS key; it now lives server-side (ORS_API_KEY).
        const { orsApiKey, ...stored } = JSON.parse(raw) || {};
        return { ...defaultSettings, ...stored };
      }
    } catch {}
    return { ...defaultSettings };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const api = useMemo(() => ({
    settings,
    setTheme: (theme) => setSettings((s) => ({ ...s, theme })),
    setFontScale: (scale) => setSettings((s) => ({ ...s, fontScale: Number(scale) || 1 })),
  }), [settings]);

  return (
    <SettingsContext.Provider value={api}>{children}</SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
