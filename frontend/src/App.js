import React, { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [trips, setTrips] = useState([]);
  const [form, setForm] = useState({ name: "", start_date: "", end_date: "" });

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = () => {
    axios.get("http://127.0.0.1:3001/api/trips")
      .then((res) => setTrips(res.data))
      .catch((err) => console.error(err));
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post("http://127.0.0.1:3001/api/trips", form)
      .then(() => {
        fetchTrips(); // refresh list after adding
        setForm({ name: "", start_date: "", end_date: "" }); // reset form
      })
      .catch(err => console.error(err));
  };

  return (
    <div>
      <h1>My Trips</h1>

      <form onSubmit={handleSubmit}>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Trip Name"
          required
        />
        <input
          type="date"
          name="start_date"
          value={form.start_date}
          onChange={handleChange}
          required
        />
        <input
          type="date"
          name="end_date"
          value={form.end_date}
          onChange={handleChange}
          required
        />
        <button type="submit">Add Trip</button>
      </form>

      <ul>
        {trips.map(trip => (
          <li key={trip.id}>
            {trip.name} ({trip.start_date} → {trip.end_date})
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
