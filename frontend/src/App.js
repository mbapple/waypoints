// frontend/src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import TripList from "./pages/TripList";
import CreateTrip from "./pages/CreateTrip";
import TripDetails from "./pages/TripDetails";

function App() {
  return (
    <Router>
      <nav>
        <Link to="/">All Trips</Link> | <Link to="/create">Create New Trip</Link>
      </nav>

      <Routes>
        <Route path="/" element={<TripList />} />
        <Route path="/create" element={<CreateTrip />} />
        <Route path="/trip/:tripID" element={<TripDetails />} />
      </Routes>
    </Router>
  );
}

export default App;
