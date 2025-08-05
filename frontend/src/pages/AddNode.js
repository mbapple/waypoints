// frontend/src/pages/CreateTrip.js
import React, { useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import "../styles/CreateTrip.css"; // ← Import the stylesheet

function AddNode() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const {tripID} = useParams();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:3001/api/nodes", {
        name,
        trip_id: tripID,
        description: description,
        arrival_date: startDate,
        departure_date: endDate,
        notes: notes,
      });
      alert("Node created!");
    } catch (err) {
      console.error(err);
      alert("Failed to create node");
    }
  };

  return (
    <form className="create-trip-form" onSubmit={handleSubmit}>
      <h2>Create a New Node</h2>
      <input
        type="text"
        placeholder="Node Location"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Description"
        value={(description)}
        onChange={(e) => setDescription(e.target.value)}
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
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <button type="submit">Save Node</button>
    </form>
  );
}

export default AddNode;
