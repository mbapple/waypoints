Running Backend
```
uvicorn main:app --host 0.0.0.0 --port 3001 --reload
```



# Travel Tracker App
The goal of this is to provide a solution to track any and all types of travel. It will be a web app designed to be self hosted, providing a place for a user to log trips and destinations. It is an all inclusive solution for tracking distances traveled, locations visitied, and destinations stopped at.

# Goals:


# Stack:
```
datbase container/
└── PostgreSQL
app container
└──backend/
	└── FastAPI
└──frontend/
	└── React app
		├── Leaflet Integration
		└── Styled with styled-components 
```

# Postgre Data Scheme:
**Trips:** 
- Entire trip that consists of legs and nodes
**Legs:**
- Long distances of travel between nodes, i.e. flights, car trips, trains
**Nodes:** 
- Major destinations i.e. Cities
**Stops:**
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
- [X] Add README for API endpoints
- [X] Add stops to frontend
- [X] Integrate OSM location selection for nodes/stops/legs
- [X] Clean up order in API, database, and add pages to make consistent
- [X] Make legs/nodes a drop down to reveal stops
- [X] Make legs display correctly
- [X] Add ability to update trips/legs/nodes
- [ ] Add ability to add photos
- [X] Add features to API and implement on frontend:
	- [X] Total miles of a given trip
	- [X] Total destination count
- [ ] Add flights/trains/etc. to API
	- [X] On AddLeg, add a box that appears below to get all this info
- [X] Integrate into a map view with Leaflet
- [X] Integrate into online services 
	- [X] Flight data
	- [X] Driving distance
- [X] Provide statistics about travel: distances, destination lists
- [ ] Fine tune styling
- [ ] Figure out how to update database without breaking
- [ ] Figure out how to backup database
- [X] Organize page files
- [X] Pull out redundant functions into separate file
- [X] Add ability to customize style and light/dark mode
- [ ] Add create trip by flight numbers feature
- [ ] Add create trip by cruise
- [ ] Make a list of general cleanup to do
	- [ ] Fix loading page issues
	- [ ] Fix miles when adding/updating a car leg
- [ ] Fix bugs with updating components, particularly if you change transportation type of leg
- [ ] Add maps of individual trips

