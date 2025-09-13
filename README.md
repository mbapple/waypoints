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
- [X] Figure out how to update database without breaking
- [ ] Figure out how to backup database
- [X] Organize page files
- [X] Pull out redundant functions into separate file
- [X] Add ability to customize style and light/dark mode
- [X] Add create trip by flight numbers feature
- [ ] Add create trip by cruise
- [X] Make a list of general cleanup to do
	- [X] Fix loading page issues
	- [X] Fix miles when adding/updating a car leg
	- [X] Fix rounding with miles
	- [X] Add icons for stops onto map rather than just points
	- [X] Fix light mode color scheme
	- [X] General cleanup of code and pulling out functions/reused components
	- [X] Clean up what is show on TripDetails page
	- [ ] Dates not being saved w/ Quick Create
	- [x] Make only one date appear on first/last nodes
	- [X] Visually separate legs from nodes
	- [X] Fix styling of dropdown when uploading photo
	- [X] Fix leg display name when creating stop
	- [x] Figure out a way to correctly order stops and nodes that ocurred on same day
	- [ ] Add pick a random photo
	- [X] Hide invisible nodes from map
	- [X] Add dropdown to edit invisble nodes
	- [X] Filter destination count by unique osm id and first/last destinations
- [X] Fix bugs with updating components, particularly if you change transportation type of leg
- [X] Add maps of individual trips
- [X] Come up with actual name for project
- [ ] Design logo
- [X] Complete docker-compose.yml and install script so that it can be installed with one command and mount relevant volumes
- [X] Add detailed statistics page
- [ ] Timeline view and route replay
- [X] Fix invisible ndoes: Display in trip list but not on map and do not count towards destination
- [ ] Make trip list display more distinctly with different colors for different item types
- [X] Fix bug over international date line
- [ ] Make nodes appear smaller on map
- [X] Add ability to custom order stops w/in nodes
	Hacked by ordering by updated_at
- [X] Add created_at and updated_at timestamps to all datatypes
- [ ] Clean up API endpoints to only return relevant data on call
- [X] Add statistics to statistics: Nights, distances by travel type
- [X] Auto fill distances on all leg types
- [ ] Make browser display name based on current page
- [ ] Design logo and implement
- [ ] Fix mess that is MapView getting data from the page itself and in the MapView
- [ ] Fix container so it doesn't rebuild frontend each time
- [X] Possibly refactor so that limited data is sent via API and specific components call for full data
- [X] Not all data is shown in editing forms
- [X] Simplify statistics page code
- [ ] Add airport statistics
- [ ] Make trip details display look better
- [X] Add date to stops
	- [X] API
	- [X] Form
	- [X] Display
- [X] Add day by day itenerary of each trip
	- [ ] Clean up this
- [X] Add overall calendar of travel
- [X] osm_id not being saved????
- [ ] Fix consistencies in whether states are counted by nodes or stops
- [ ] Add global search feature
- [ ] Major refactor:
	- [X] Lighten up what is sent over API for a nodes/stops by trip, lazy load the rest of the details
		- Can't really do this as it messes up Mapview where 90% of data is needed anyways
	- [X] Move the pop up component from Statistics into a general use so it can be reused
	- [ ] Rather than expand cards, use the pop up to show more details
		- [ ] Remove expand code
		- [ ] Link to pop up
- [X] Make at least somewhat mobile friendly
	- [X] Fix navigation bar issue
	- [ ] Fix any other pages
	- [ ] Fix call to API
- [ ] Add stop/end dates to stops so ex. hotels can be spread across multiple days
- [X] Add ability to add categories to stops
- [ ] Add ability to upload multiple pohotos at once
- [X] Fix look of buttons on map
- [ ] Fix trip itenerary view
- [X] Fix calendar list view
- [X] Add pop ups to show more details in trips, figure out way to cleanly display stops
- [ ] Make links on map auto pop up node/stop details rather than just linking to trip
- [ ] Add new data type to represent single adventures