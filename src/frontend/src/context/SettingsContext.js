import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'app.settings.v1';

const defaultSettings = {
  theme: 'dark',
  orsApiKey: '',
  fontScale: 1,
};

const SettingsContext = createContext({
  settings: defaultSettings,
  setTheme: (theme) => {},
  setOrsApiKey: (key) => {},
  setFontScale: (scale) => {},
});

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
    } catch {}
    // hydrate from env for first load
    const envKey = window?.env?.REACT_APP_ORS_API_KEY || process.env.REACT_APP_ORS_API_KEY || '';
    return { ...defaultSettings, orsApiKey: envKey };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const api = useMemo(() => ({
    settings,
    setTheme: (theme) => setSettings((s) => ({ ...s, theme })),
    setOrsApiKey: (key) => setSettings((s) => ({ ...s, orsApiKey: key })),
    setFontScale: (scale) => setSettings((s) => ({ ...s, fontScale: Number(scale) || 1 })),
  }), [settings]);

  return (
    <SettingsContext.Provider value={api}>{children}</SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
