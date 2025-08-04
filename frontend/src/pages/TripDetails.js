import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";


function TripDetails() {
  const { tripID } = useParams();
  console.log("Trip ID:", tripID);
  const [ trip, setTrip ] = useState(null);
  const [ loading, setLoading ] = useState(true);

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

  }, [tripID]);

if (loading) return <p>Loading...</p>
if (!trip)   return <p>Trip not found {tripID} </p>;

return (
    <div className="trip-details">
      <h1>{trip.name}</h1>
      <p><strong>Start Date:</strong> {trip.start_date}</p>
      <p><strong>End Date:</strong> {trip.end_date}</p>
      <p><strong>Description:</strong> {trip.description || "No description provided."}</p>
    </div>
  );
}


export default TripDetails;
