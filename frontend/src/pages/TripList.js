import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";


function App() {
  const [trips, setTrips] = useState([]);
  
  useEffect(() => {
    fetchTrips();
  }, []);

const fetchTrips = () => {
    axios.get("http://localhost:3001/api/trips")
      .then((res) => setTrips(res.data))
      .catch((err) => console.error(err));
  };

    return (
    <div>
      <h1>My Trips</h1>

      <ul>
        {trips.map(trip => (
          <li key={trip.id}>
            <Link to={`/trip/${trip.id}`}>
              {trip.name} ({trip.start_date} → {trip.end_date})
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;