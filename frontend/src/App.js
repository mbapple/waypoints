import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { themes } from "./styles/theme";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { GlobalStyles, Container } from "./styles/components";
import Map from "./pages/Map";
import Navigation from "./components/Navigation";
import TripList from "./pages/TripList";
import CreateTrip from "./pages/Create/CreateTrip";
import CreateTripQuick from "./pages/Create/CreateTripQuick";
import TripDetails from "./pages/TripDetails";
import TripMap from "./pages/TripMap";
import AddNode from "./pages/Create/AddNode";
import AddLeg from "./pages/Create/AddLeg";
import AddStop from "./pages/Create/AddStop";
import Settings from "./pages/Settings";
import UpdateTrip from "./pages/Update/UpdateTrip";
import UpdateNode from "./pages/Update/UpdateNode";
import UpdateLeg from "./pages/Update/UpdateLeg";
import UpdateStop from "./pages/Update/UpdateStop";
import Statistics from "./pages/Statistics";
import Calendar from "./pages/Calendar";

const ThemedApp = () => {
  const { settings } = useSettings();
  const theme = themes[settings.theme] || themes.dark;
  useEffect(() => {
    try {
      document.documentElement.style.setProperty('--font-scale', String(settings.fontScale ?? 1));
    } catch {}
  }, [settings.fontScale]);
  return (
    <ThemeProvider theme={theme}>
        <GlobalStyles />
      <Router>
        <Navigation />
        <Container>
          <Routes>
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
            <Route path="/calendar" element={<Calendar />} />
          </Routes>
        </Container>
      </Router>
    </ThemeProvider>
  );
}

function App() {
  return (
    <SettingsProvider>
      <ThemedApp />
    </SettingsProvider>
  );
}

export default App;
