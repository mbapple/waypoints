import React, { useState, useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { 
    Input, 
    DropdownContainer, 
    DropdownMenu, 
    DropdownItem, 
    LoadingSpinner 
} from '../styles/components';
import { placeShortName } from '../utils/places';

const DropdownHeading = styled.div`
    padding: ${props => props.theme.space[2]} ${props => props.theme.space[3]};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: ${props => props.theme.colors.backgroundSecondary};
`;

const MAX_LOCAL_MATCHES = 5;
const NOMINATIM = 'https://nominatim.openstreetmap.org';

const nominatimOsmId = (place) => `${place.osm_type.charAt(0).toUpperCase()}${place.osm_id}`;

// Nominatim result -> the place shape PlaceSearchInput passes to onPlaceSelect
export const nominatimToPlace = (place) => ({
    name: place.display_name,
    lat: parseFloat(place.lat),
    lon: parseFloat(place.lon),
    boundingBox: place.boundingbox,
    type: place.type,
    address: place.address,
    osm_id: nominatimOsmId(place),
    osm_country: place.address?.country,
    osm_state: place.address?.state,
    shortName: placeShortName(place),
});

// First Nominatim hit for free text (any feature type), or null
export async function searchNominatimFirst(query, { signal } = {}) {
    const resp = await fetch(
        `${NOMINATIM}/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(query)}`,
        { signal }
    );
    if (!resp.ok) throw new Error(`Nominatim search failed (${resp.status})`);
    const data = await resp.json();
    return Array.isArray(data) && data.length ? nominatimToPlace(data[0]) : null;
}

// Look up OSM ids like "R7444" / "N123" (max 50 per Nominatim call) -> { osmId: place }
export async function lookupNominatimOsmIds(ids, { signal } = {}) {
    if (!ids.length) return {};
    const resp = await fetch(
        `${NOMINATIM}/lookup?format=json&addressdetails=1&osm_ids=${encodeURIComponent(ids.join(','))}`,
        { signal }
    );
    if (!resp.ok) throw new Error(`Nominatim lookup failed (${resp.status})`);
    const data = await resp.json();
    const out = {};
    (Array.isArray(data) ? data : []).forEach((p) => { const place = nominatimToPlace(p); out[place.osm_id] = place; });
    return out;
}

// localPlaces (optional): places already visited, shaped like listDestinations() rows
// ({ name, osm_name, osm_id, osm_country, osm_state, latitude, longitude }). Matches are
// listed above the Nominatim results so repeat places reuse the same OSM id.
export const PlaceSearchInput = ({ onPlaceSelect, placeholder = "Search for a place...", className = "", value, onChange, localPlaces }) => {
    const [query, setQuery] = useState(value || '');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);
    const justSelected = useRef(false); // don't re-search the name we just filled in

    const localMatches = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q || !localPlaces?.length) return [];
        return localPlaces
            .filter(p => p.latitude != null && p.longitude != null)
            .filter(p => (p.name || '').toLowerCase().includes(q) || (p.osm_name || '').toLowerCase().includes(q))
            .slice(0, MAX_LOCAL_MATCHES);
    }, [query, localPlaces]);

    // Debounce search function
    useEffect(() => {
        if (justSelected.current) {
            justSelected.current = false;
            return undefined;
        }
        const timeoutId = setTimeout(() => {
            if (query.length > 2) {
                searchPlaces(query);
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [query]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const searchPlaces = async (searchQuery) => {
        setLoading(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1&extratags=1&namedetails=1&featuretype=settlement`
            );
            const data = await response.json();
            setResults(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error searching places:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    // Hide Nominatim hits that are already listed as visited places
    const localIds = new Set(localMatches.map(p => p.osm_id).filter(Boolean));
    const remoteResults = results.filter(place => !localIds.has(nominatimOsmId(place)));

    const finishSelect = (displayName) => {
        justSelected.current = displayName !== query; // the effect only runs if query changes
        setQuery(displayName);
        setResults([]);
        setIsOpen(false);
        if (onChange) {
            onChange({ target: { value: displayName } });
        }
    };

    const handleSelectPlace = (place) => {
        if (onPlaceSelect) onPlaceSelect(nominatimToPlace(place));
        finishSelect(place.display_name);
    };

    const handleSelectLocal = (p) => {
        const displayName = p.osm_name || p.name;
        if (onPlaceSelect) {
            onPlaceSelect({
                name: displayName,
                lat: Number(p.latitude),
                lon: Number(p.longitude),
                osm_id: p.osm_id || '',
                osm_country: p.osm_country || '',
                osm_state: p.osm_state || '',
                shortName: p.name || placeShortName({ name: displayName }),
            });
        }
        finishSelect(displayName);
    };

    const handleInputChange = (e) => {
        setQuery(e.target.value);
        setIsOpen(e.target.value.trim().length > 0);
        if (onChange) onChange(e);
    };

    const showDropdown = isOpen && (localMatches.length > 0 || remoteResults.length > 0);

    return (
        <DropdownContainer className={className} ref={dropdownRef}>
            <Input
                ref={inputRef}
                type="text"
                value={value !== undefined ? value : query}
                onChange={handleInputChange}
                onFocus={() => { if (query.trim()) setIsOpen(true); }}
                placeholder={placeholder}
            />
            
            {loading && (
                <LoadingSpinner>
                    <div className="spinner"></div>
                </LoadingSpinner>
            )}

            {showDropdown && (
                <DropdownMenu>
                    {localMatches.length > 0 && (
                        <>
                            <DropdownHeading>Visited</DropdownHeading>
                            {localMatches.map((p, index) => (
                                <DropdownItem key={`local-${p.key || p.osm_id || index}`} onClick={() => handleSelectLocal(p)}>
                                    <div className="primary-text">{p.name}</div>
                                    <div className="secondary-text">{p.osm_name || [p.osm_state, p.osm_country].filter(Boolean).join(', ')}</div>
                                </DropdownItem>
                            ))}
                            {remoteResults.length > 0 && <DropdownHeading>Search results</DropdownHeading>}
                        </>
                    )}
                    {remoteResults.map((place, index) => (
                        <DropdownItem
                            key={`${place.place_id}-${index}`}
                            onClick={() => handleSelectPlace(place)}
                        >
                            <div className="primary-text">
                                {place.display_name.split(',')[0]}
                            </div>
                            <div className="secondary-text">
                                {place.display_name}
                            </div>
                        </DropdownItem>
                    ))}
                </DropdownMenu>
            )}
        </DropdownContainer>
    );
};



export const getPlaceLink = (osmID, osmName) => {
    if (!osmID) return '#';
    const baseUrl = 'https://www.openstreetmap.org';
    const type = osmID.startsWith('N') ? 'node' : osmID.startsWith('W') ? 'way' : 'relation';
    const idNumber = osmID.slice(1);
    return `${baseUrl}/${type}/${idNumber}`;
};