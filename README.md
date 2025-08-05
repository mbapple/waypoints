# Travel Tracker App
The goal of this is to provide a solution to track any and all types of travel. It will be a web app designed to be self hosted, providing a place for a user to log trips and destinations. It is an all inclusive solution for tracking distances traveled, locations visitied, and destinations stopped at.

# Goals:


# Stack:
```
database/
├── PostgreSQL
backend/
├── FastAPI
frontend/
├── React app 
```

# Postgre Data Scheme:
Trips: 
- Entire trip that consists of legs and nodes
Legs: 
- Long distances of travel between nodes, i.e. flights, car trips, trains
Nodes: 
- Major destinations i.e. Cities
Stops:
- Attached to either a leg or a node
- Destinations such as restaurants, hotels, parks

# Implementations:
- [ ] PostgreSQL Database
- [ ] PostGIS integration for location data
- [ ] React and Leaflet frontend
- [ ] Online integrations for:
	- [ ] Flight data
	- [ ] Driving distances
	- [ ] Place markers


# To Do:
- [X] Get something working
- [ ] Implement PostgreSQL database with ability to add and query trips, nodes, legs
	- [ ] Ability to provide sorted lists
- [ ] Implement front end to show trips, nodes, legs and ability to add each
- [ ] Implemnt basic styling
- [ ] Integrate into a map view with Leaflet
- [ ] Integrate into online services 
	- [ ] Flight data
	- [ ] Driving distance
- [ ] Provide statistics about travel: distances, destination lists




