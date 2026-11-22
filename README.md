#  Waypoints
Waypoints is a self hosted travel tracking solution. It is an all in one solution to log trips and destinations. Waypoints helps you to visualize your travel providing a detailed map view of your past journeys. The data driven app collects information on the places you go and the routes you take to visualize and quantify your journeys around the world.

# Database Schema
The main way to track travel is through the creation of trips and components:
- `Trips`: Just that, representing a trip be it one night or 2 weeks. The trip stores the dates of travel.
- `Nodes`: These are the destinations of your trip, usually starting and ending with your home. These are the cities, campsites, wherever you would say you are going.
- `Legs`: These are the travel between your nodes: flights, road trips, etc. 
- `Stops`: Stops allow you to track anywhere you want to remember. Be it the hotel you stayed in, a restaurant you stopped at along the way, etc. Stops are attached to either nodes or legs and are meant to be a journal of sorts. In settings, you can create your own list of categories to represent stops and assign an emoji to represent them on the map.

Nodes, Legs, and Stops are attached to places in Open Street Maps so that their coordinates can automatically be saved to contribute to the map of all your travels.

Photos can also be uploaded and are attached to Trips themselves or any of the other types. If you use [Immich](https://immich.app), you can link photos from your library instead of uploading them. The picker shows the photos taken during the trip and suggests the node, leg or stop each one belongs to, based on its date and location. Adventures can link Immich photos from their dates too, from the adventure's edit page.

**Adventures:**
`Adventures` are another way to track your journeys. They are similar in schema to `stops` but not associated. These are meant for your day trips, hikes, dives, anything special enough you want to track. They appear onside the map alongside the rest of your trips but don't contain the extra travel information.

**Lists:**
Lists are like travel goals. They can be a list of specific locations, a list of states, or a list of months of travel, whatever you want to see as you track your travel. You can create a custom list by inputting a comma separated list. They can be matched to the countries, state, or location name from OSM. Regex matching allows for automatic matching. You can also manually check off something if it is not automatically matched to a travel component.

**Travel Information:**
The database also stores additonal information about your legs. For car legs, you can automatically track the route outline and driving time using Open Route Service. For flights you can keep track of the airline and flight information, and fetch the path the plane actually flew from the OpenSky Network. Flights without a recorded path are drawn as great-circle arcs. More integrations coming.

# Features:
## Map View:
View all of your trips on a single map. Here you can visualize your waypoints around the world. You can also view any single trip on a map.
Switch the map to **Airports visited** (both ends of every flight, including hidden layover nodes) or **Cities visited** (every city you've had a node or stop in, grouped by the city itself even when the places have different OpenStreetMap ids) to see just those places. Selecting a trip under the map focuses it and fades every other trip.
Lists with linked locations appear in the **Lists…** menu next to these views: every item is pinned at the list's own coordinates, and items you haven't visited yet are faded.

## Calendar View:
View an overview of your trips on the yearly calendar where you can easily see the days you have travelled. A montly view allows for more detailed display destinations and stops.

## Statistics:
With the statistics view, you can see how many miles you have travelled on each transportation type, how many nights you have spent away from home, and track custom lists of travel goals.
Click **Unique destinations** to list every destination. Use **Merge mode** to combine duplicates: select destinations, press Merge, then keep one of them or search for a different OpenStreetMap place. Every node of the merged destinations takes that place's name, OSM details and coordinates, and leg endpoints and `osm_id` lists follow. Stored leg miles are not recalculated. Back up first, as a merge can't be undone.
On a list, **Link Locations** gives each item a map location (it never happens automatically). Every item without one is searched on OpenStreetMap and the first result is filled in; change or clear any row, then Save. Reopen it at any time to edit the locations. Searches run about one per second to respect Nominatim's usage policy, so long lists take a while. Date lists can't be linked.

## Settings:
**Visited cities** looks up which city each existing node and stop is in (new and edited places are looked up automatically when saved). Press **Look up missing cities** and watch each place get fixed in the log. Places with no city at that spot (rural stops, for example) are listed and skipped.

## Backups:
Backups of the database can be created in the settings menu. These backups can be downloaded and restored.
Backing up of photos coming.


# Installation:
Waypoints runs in three docker containers. 

### 1. Copy the example config files
```bash
cp docker-compose.yml.example docker-compose.yml
cp .env.example .env
```
Both copies are gitignored, so your changes stay local.

### 2. Edit `.env`
Set a strong `POSTGRES_PASSWORD` and, optionally, your `ORS_API_KEY` for driving routes. All settings and secrets live here; `docker-compose.yml` reads them automatically. Change paths or ports in `docker-compose.yml` if needed.

### 3. Launch the containers
```bash
docker compose up
```
The web UI is served on `http://localhost:3000` (or `FRONTEND_PORT`).

### Upgrading from an older version
Older versions hardcoded the database credentials (`user` / `password`) in `docker-compose.yml`. An existing `db_data/` directory keeps the credentials it was created with, so set `POSTGRES_USER` and `POSTGRES_PASSWORD` in `.env` to those values. Otherwise, change the password inside Postgres first. The OpenRouteService key is no longer stored in the browser. Move it to `ORS_API_KEY` in `.env`.

# Security:
WayPoints has **no user authentication**. Anyone who can reach the web UI can view and edit all data, and can create, download and restore database backups. Restoring runs SQL against the database. Run it only on a trusted network, behind a VPN, or behind a reverse proxy that adds authentication. Do not expose port 3000 directly to the internet. The frontend container also serves the Vite development server rather than a hardened production build. If you reach WayPoints through a hostname (for example via a reverse proxy), add that hostname to `FRONTEND_ALLOWED_HOSTS` in `.env`.

# Tech Stack:
```
datbase container
└── PostgreSQL
backend
└── FastAPI
frontend
└── React app (Vite)
	├── Leaflet Integration (OpenStreetMap tiles, no API key needed)
	└── Styled with styled-components 
```
**Integrations:**
- [Nominatim](https://nominatim.org/): API used to search for places in Open Street Map.
- [Open Route Service](https://openrouteservice.org): Automatically fetch driving path and distance between locations in a leg. Set `ORS_API_KEY` in `.env`. Requests are proxied through the backend, so the key never reaches the browser.
- [OpenSky Network](https://opensky-network.org): Fetch the actual flown path of a flight from its flight number and date. Create a free OpenSky account, add an API client under Account, and set `OPENSKY_CLIENT_ID` and `OPENSKY_CLIENT_SECRET` in `.env`. OpenSky publishes flights the day after they fly and keeps tracks for about 30 days, so fetch the path within that window. The path is then stored in WayPoints. Flight numbers are matched to radio callsigns with [adsbdb](https://adsbdb.com) and airport codes with [hexdb.io](https://hexdb.io), which need no key. All requests go through the backend.
- [Immich](https://immich.app): Link photos from your Immich library to a trip and its nodes, legs and stops, or to an adventure. Set `IMMICH_URL` (as reachable from the backend container) and `IMMICH_API_KEY` (with `asset.read` and `asset.view` permissions) in `.env`. All Immich requests, including the images themselves, go through the backend. The browser never contacts Immich or sees the key. Linked photos are not copied, so they need Immich to be running to display.


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
- [X] Add flights/trains/etc. to API
	- [X] On AddLeg, add a box that appears below to get all this info
- [X] Integrate into a map view with Leaflet
- [X] Integrate into online services 
	- [X] Flight data
	- [X] Driving distance
- [X] Provide statistics about travel: distances, destination lists
- [X] Fine tune styling
- [X] Figure out how to update database without breaking
- [X] Figure out how to backup database
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
	- [X] Dates not being saved w/ Quick Create
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
- [X] Clean up API endpoints to only return relevant data on call
- [X] Add statistics to statistics: Nights, distances by travel type
- [X] Auto fill distances on all leg types
- [ ] Make browser display name based on current page
- [ ] Design logo and implement
- [X] Fix mess that is MapView getting data from the page itself and in the MapView
- [ ] Fix container so it doesn't rebuild frontend each time
- [X] Possibly refactor so that limited data is sent via API and specific components call for full data
- [X] Not all data is shown in editing forms
- [X] Simplify statistics page code
- [ ] Add airport statistics
- [X] Make trip details display look better
- [X] Add date to stops
	- [X] API
	- [X] Form
	- [X] Display
- [X] Add day by day itenerary of each trip
	- [X] Clean up this
- [X] Add overall calendar of travel
- [X] osm_id not being saved????
- [X] Fix consistencies in whether states are counted by nodes or stops
- [X] Add global search feature
- [X] Major refactor:
	- [X] Lighten up what is sent over API for a nodes/stops by trip, lazy load the rest of the details
		- Can't really do this as it messes up Mapview where 90% of data is needed anyways
	- [X] Move the pop up component from Statistics into a general use so it can be reused
	- [X] Rather than expand cards, use the pop up to show more details
		- [X] Remove expand code
		- [X] Link to pop up
- [X] Make at least somewhat mobile friendly
	- [X] Fix navigation bar issue
	- [X] Fix any other pages
	- [X] Fix call to API
- [X] Add stop/end dates to stops so ex. hotels can be spread across multiple days
- [X] Add ability to add categories to stops
- [ ] Add ability to upload multiple pohotos at once
- [X] Fix look of buttons on map
- [X] Fix trip itenerary view
- [X] Fix calendar list view
- [X] Add pop ups to show more details in trips, figure out way to cleanly display stops
- [ ] Make links on map auto pop up node/stop details rather than just linking to trip
- [X] Add new data type to represent single adventures
	- [X] Separate table
	- [X] New page to view adventures
	- [X] Add to calendar
	- [X] Add to search function
	- [X] Add to statistics page, count under stops, display in separated list
	- [ ] Include in state count
- [ ] Fix issue where it freezes randomly
- [X] Ensure all OSM fields are updated when you change location
- [ ] fix frame rate when zooming on map
- [ ] Add screenshots and more detailed instructions to README
- [X] Add lists table
- [ ] On map, link to all trips when you select a node (use the existing API call)
- [ ] Add activities
	- [ ] Diving
	- [ ] Hiking
	- [ ] misc.
- [X] Fix issue where map appears over navigation bar
- [ ] Fix emojis not always loading

Genearal Cleanup to do by hand:
- [ ] Use the same component when viewing destinations by stop category, by country, by list
	- [ ] Show the date in this component
- [ ] Have Map show all visits to a node
- [ ] Fix the itenerary daily view
- [ ] Remove unnecessary styling across pages
