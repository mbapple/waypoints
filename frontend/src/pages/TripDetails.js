import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom"
import axios from "axios";


function TripDetails() {
  const { tripID } = useParams();
  //console.log("Trip ID:", tripID);
  const [ trip, setTrip ] = useState(null);
  const [ loading, setLoading ] = useState(true);
  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    axios.get(`http://localhost:3001/api/trips/${tripID}`)
      .then((res) => {
        setTrip(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
      fetchNodes();
  }, [tripID]);

const fetchNodes = () => {
  axios.get(`http://localhost:3001/api/nodes/by_trip/${tripID}`)
    .then((res) => setNodes(res.data))
    .catch((err) => console.error(err));
};

if (loading) return <p>Loading...</p>
if (!trip)   return <p>Trip not found {tripID} </p>;

return (
    <div className="trip-details">
      {/* BASIC TRIP INFO */}
      <h1>{trip.name}</h1>
      <p><strong>Start Date:</strong> {trip.start_date}</p>
      <p><strong>End Date:</strong> {trip.end_date}</p>
      <p><strong>Description:</strong> {trip.description || "No description provided."}</p>
      
      <h2>Details:</h2>

      <ul>
        {nodes.map(trip => (
          <li key={trip.id}>
            <Link to={`/nodes/${trip.id}`}>
              {trip.name} ({trip.arrival_date} → {trip.departure_date})
            </Link>
          </li>
        ))}
      </ul>

      
      {/* ADD NODE BUTTON */}
      <button
        onClick={() => {
          // Navigate to add node page or open modal
          window.location.href = `/trip/${tripID}/add-node`;
        }}
        style={{ marginRight: "10px", background: "#3498db", color: "#fff", border: "none", padding: "10px 20px", cursor: "pointer" }}
      >
        Add Node
      </button>

      {/* ADD LEG BUTTON */}
      <button
        onClick={() => {
          // Navigate to add leg page or open modal
          window.location.href = `/trip/${tripID}/add-leg`;
        }}
        style={{ background: "#2ecc71", color: "#fff", border: "none", padding: "10px 20px", cursor: "pointer" }}
      >
        Add Leg
      </button>
      
      

      {/* DELETE BUTTON */}
      <button
        onClick={async () => {
          try {
            await axios.delete(`http://localhost:3001/api/trips/${tripID}`);
            window.location.href = "/trips";
          } catch (err) {
            alert("Failed to delete trip.");
            console.error(err);
          }
        }}
        style={{ marginTop: "20px", background: "#e74c3c", color: "#fff", border: "none", padding: "10px 20px", cursor: "pointer" }}
      >
        Delete Trip
      </button>

    </div>
  );
}


export default TripDetails;
