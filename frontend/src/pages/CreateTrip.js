// frontend/src/pages/CreateTrip.js
import React, { useState } from "react";
import axios from "axios";
import "../styles/CreateTrip.css"; // ← Import the stylesheet

function CreateTrip() {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:3001/api/trips", {
        name,
        start_date: startDate,
        end_date: endDate,
        description: description,
      });
      alert("Trip created!");
    } catch (err) {
      console.error(err);
      alert("Failed to create trip");
    }
  };

  return (
    <form className="create-trip-form" onSubmit={handleSubmit}>
      <h2>Create a New Trip</h2>
      <input
        type="text"
        placeholder="Trip Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        required
      />
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <button type="submit">Save Trip</button>
    </form>
  );
}

export default CreateTrip;
