import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { theme } from "./styles/theme";
import { GlobalStyles, Container } from "./styles/components";
import Navigation from "./components/Navigation";
import TripList from "./pages/TripList";
import CreateTrip from "./pages/Create/CreateTrip";
import TripDetails from "./pages/TripDetails";
import AddNode from "./pages/Create/AddNode";
import AddLeg from "./pages/Create/AddLeg";
import AddStop from "./pages/Create/AddStop";
import Settings from "./pages/Settings";
import UpdateTrip from "./pages/Update/UpdateTrip";
import UpdateNode from "./pages/Update/UpdateNode";
import UpdateLeg from "./pages/Update/UpdateLeg";
import UpdateStop from "./pages/Update/UpdateStop";


function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <Router>
        <Navigation />
        <Container>
          <Routes>
            <Route path="/settings" element={<Settings />} />
            <Route path="/" element={<TripList />} />
            <Route path="/create" element={<CreateTrip />} />
            <Route path="/trip/:tripID" element={<TripDetails />} />
            <Route path="/trip/:tripID/add-node" element={<AddNode />} />
            <Route path="/trip/:tripID/add-leg" element={<AddLeg />} />
            <Route path="/trip/:tripID/add-stop" element={<AddStop />} />
            <Route path="/trip/:tripID/update" element={<UpdateTrip />} />
            <Route path="/trip/:tripID/update-node" element={<UpdateNode />} />
            <Route path="/trip/:tripID/update-leg" element={<UpdateLeg />} />
            <Route path="/trip/:tripID/update-stop" element={<UpdateStop />} />
          
            {/* Add more routes as needed */}
          </Routes>
        </Container>
      </Router>
    </ThemeProvider>
  );
}

export default App;
