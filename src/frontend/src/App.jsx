import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { themes } from "./styles/theme";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { GlobalStyles, Container, Text } from "./styles/components";
import Navigation from "./components/Navigation";
import NotFound from "./pages/NotFound";
import RouteErrorBoundary from "./components/common/RouteErrorBoundary";

// Each page is its own chunk, loaded when first visited, so the first load doesn't
// pull in every page (maps, charts, forms). NotFound is tiny and stays in the main bundle.
const Map = lazy(() => import("./pages/Map"));
const TripList = lazy(() => import("./pages/TripList"));
const CreateTrip = lazy(() => import("./pages/Create/CreateTrip"));
const CreateTripQuick = lazy(() => import("./pages/Create/CreateTripQuick"));
const TripDetails = lazy(() => import("./pages/TripDetails"));
const TripMap = lazy(() => import("./pages/TripMap"));
const AddNode = lazy(() => import("./pages/Create/AddNode"));
const AddLeg = lazy(() => import("./pages/Create/AddLeg"));
const AddStop = lazy(() => import("./pages/Create/AddStop"));
const Settings = lazy(() => import("./pages/Settings"));
const UpdateTrip = lazy(() => import("./pages/Update/UpdateTrip"));
const UpdateNode = lazy(() => import("./pages/Update/UpdateNode"));
const UpdateLeg = lazy(() => import("./pages/Update/UpdateLeg"));
const UpdateStop = lazy(() => import("./pages/Update/UpdateStop"));
const Statistics = lazy(() => import("./pages/Statistics"));
const FlightData = lazy(() => import("./pages/FlightData"));
const Calendar = lazy(() => import("./pages/Calendar"));
const SearchPage = lazy(() => import("./pages/Search"));
const AdventureList = lazy(() => import("./pages/AdventureList"));
const AddAdventure = lazy(() => import("./pages/Create/AddAdventure"));
const UpdateAdventure = lazy(() => import("./pages/Update/UpdateAdventure"));
const AdventureDetails = lazy(() => import("./pages/AdventureDetails"));
const AddList = lazy(() => import("./pages/Lists/AddList"));
const UpdateList = lazy(() => import("./pages/Lists/UpdateList"));

const ThemedApp = () => {
  const { settings } = useSettings();
  const theme = themes[settings.theme] || themes.dark;
  useEffect(() => {
    try {
      document.documentElement.style.setProperty('--font-scale', String(settings.fontScale ?? 1));
    } catch {}
  }, [settings.fontScale]);
  const location = useLocation();
  const pageKey = location.pathname === '/search' ? location.pathname : location.pathname + location.search;
  return (
    <ThemeProvider theme={theme}>
        <GlobalStyles />
      {/* Navigation sits outside keyed page container to avoid full remount */}
        <Navigation />
        {/* Remount the page on every route change so page state never leaks between URLs.
            Pages that keep their identity in the query string (update-node?nodeID=…,
            adventures/view?adventureID=…) need the search in the key too. /search is the
            exception: it rewrites its own query while typing and must not remount. */}
        <Container key={pageKey}>
          <RouteErrorBoundary>
          <Suspense fallback={<Text variant="muted" as="p" style={{ marginTop: '1.5rem' }}>Loading…</Text>}>
          <Routes location={location}>
            <Route path="/map" element={<Map />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/" element={<TripList />} />
            <Route path="/create" element={<CreateTrip />} />
            <Route path="/create/quick" element={<CreateTripQuick />} />
            <Route path="/trip/:tripID" element={<TripDetails />} />
            <Route path="/trip/:tripID/map" element={<TripMap />} />
            <Route path="/trip/:tripID/add-node" element={<AddNode />} />
            <Route path="/trip/:tripID/add-leg" element={<AddLeg />} />
            <Route path="/trip/:tripID/add-stop" element={<AddStop />} />
            <Route path="/trip/:tripID/update" element={<UpdateTrip />} />
            <Route path="/trip/:tripID/update-node" element={<UpdateNode />} />
            <Route path="/trip/:tripID/update-leg" element={<UpdateLeg />} />
            <Route path="/trip/:tripID/update-stop" element={<UpdateStop />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/flights" element={<FlightData />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/adventures" element={<AdventureList />} />
            <Route path="/adventures/create" element={<AddAdventure />} />
            <Route path="/adventures/update" element={<UpdateAdventure />} />
            <Route path="/adventures/view" element={<AdventureDetails />} />
            <Route path="/lists/create" element={<AddList />} />
            <Route path="/lists/:id/update" element={<UpdateList />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </RouteErrorBoundary>
        </Container>
    </ThemeProvider>
  );
}

function App() {
  return (
    <SettingsProvider>
      <Router>
        <ThemedApp />
      </Router>
    </SettingsProvider>
  );
}

export default App;
