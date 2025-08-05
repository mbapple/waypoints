Running Backend
```
uvicorn main:app --host 0.0.0.0 --port 3001 --reload
```



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
├── Styled with styled-components 
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
- [X] Implement PostgreSQL database with ability to add and query trips, nodes, legs
	- [X] Ability to provide sorted lists
- [X] Implement front end to show trips, nodes, legs and ability to add each
- [X] Implemnt basic styling
- [X] Add ability to have stops
- [X] Show legs/nodes in correct order
- [ ] Add README for API endpoints
- [X] Add stops to frontend
- [ ] Make legs/nodes a drop down to reveal stops
- [ ] Add ability to update trips/legs/nodes
- [ ] Add ability to add photos
- [ ] Add features to API and implement on frontend:
	- [ ] Total miles of a given trip
	- [ ] Total destination count
- [ ] Add flights/trains/etc. to API
	- [ ] On AddLeg, add a box that appears below to get all this info
- [ ] Integrate into a map view with Leaflet
- [ ] Integrate into online services 
	- [ ] Flight data
	- [ ] Driving distance
- [ ] Provide statistics about travel: distances, destination lists
- [ ] Fine tune styling
- [ ] Figure out how to update database without breaking
- [ ] Figure out how to backup database
- [ ] Organize page files
- [ ] Pull out redundant functions into separate file



