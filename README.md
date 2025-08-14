Running Backend
```
uvicorn main:app --host 0.0.0.0 --port 3001 --reload
```



#  Waypoints
Waypoints is a self hosted travel tracking solution. It is an all in one solution to log trips and destinations. Waypoints helps you to visualize your travel providing a detailed map view of your past journeys. It is also data driven, providing overall travel statistics, tracking locations, and more.

# Database Schema
In Waypoints, travel is tracked in 4 components.
- `Trips`: Just that, representing a trip be it one night or 2 weeks. The trip stores the dates of travel.
- `Nodes`: These are the destinations of your trip, usually starting and ending with your home. These are the cities, campsites, wherever you would say you are going.
- `Legs`: These are the travel between your nodes: flights, road trips, etc. 
- `Stops`: Stops allow you to track anywhere you want to remember. Be it the hotel you stayed in, a restaurant you stopped at along the way, etc. Stops are attached to either nodes or legs and are meant to be a journal of sorts.

Nodes, Legs, and Stops are attached to places in Open Street Maps so that their coordinates can automatically be saved to contribute to the map of all your travels.

Photos can also be uploaded and are attached to Trips themselves or any of the other types.

# Installation:
Waypoints runs in two docker containers, one to handle the postgres database and one to handle the web app itself.


# Tech Stack:
```
datbase container
└── PostgreSQL
app container
└──backend/
	└── FastAPI
└──frontend/
	└── React app
		├── Leaflet Integration
		└── Styled with styled-components 
```
**Integrations:**
- [Nominatim](https://nominatim.org/): API used to search for places in Open Street Map.
- [Open Route Service](https://openrouteservice.org): Automatically fetch driving path and distance between locations in a leg. Set the API key in settings.


# License:
     This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation,version 3 of the license.

    This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.


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
- [X] Add ability to add photos
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
- [X] Fine tune styling
- [ ] Figure out how to update database without breaking
- [ ] Figure out how to backup database
- [X] Organize page files
- [X] Pull out redundant functions into separate file
- [X] Add ability to customize style and light/dark mode
- [X] Add create trip by flight numbers feature
- [ ] Add create trip by cruise
- [ ] Make a list of general cleanup to do
	- [X] Fix loading page issues
	- [X] Fix miles when adding/updating a car leg
	- [ ] Fix rounding with miles
	- [X] Add icons for stops onto map rather than just points
	- [ ] Fix light mode color scheme
	- [ ] General cleanup of code and pulling out functions/reused components
	- [ ] Clean up what is show on TripDetails page
- [ ] Fix bugs with updating components, particularly if you change transportation type of leg
- [X] Add maps of individual trips
- [ ] Come up with actual name for project
- [ ] Design logo
- [ ] Complete docker-compose.yml and install script so that it can be installed with one command and mount relevant volumes
- [ ] Add detailed statistics page
- [ ] Timeline view and route replay

