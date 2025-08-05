import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { theme } from "./styles/theme";
import { GlobalStyles, Container } from "./styles/components";
import Navigation from "./components/Navigation";
import TripList from "./pages/TripList";
import CreateTrip from "./pages/CreateTrip";
import TripDetails from "./pages/TripDetails";
import AddNode from "./pages/AddNode";
import AddLeg from "./pages/AddLeg";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <Router>
        <Navigation />
        <Container>
          <Routes>
            <Route path="/" element={<TripList />} />
            <Route path="/create" element={<CreateTrip />} />
            <Route path="/trip/:tripID" element={<TripDetails />} />
            <Route path="/trip/:tripID/add-node" element={<AddNode />} />
            <Route path="/trip/:tripID/add-leg" element={<AddLeg />} />
          </Routes>
        </Container>
      </Router>
    </ThemeProvider>
  );
}

export default App;
