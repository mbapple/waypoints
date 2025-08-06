import React, { useState, useEffect, useRef } from 'react';
import { 
    Input, 
    DropdownContainer, 
    DropdownMenu, 
    DropdownItem, 
    LoadingSpinner 
} from '../styles/components';

const PlaceSearchInput = ({ onPlaceSelect, placeholder = "Search for a place...", className = "" }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    // Debounce search function
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (query.length > 2) {
                searchPlaces(query);
            } else {
                setResults([]);
                setIsOpen(false);
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
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`
            );
            const data = await response.json();
            setResults(data);
            setIsOpen(data.length > 0);
        } catch (error) {
            console.error('Error searching places:', error);
            setResults([]);
            setIsOpen(false);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPlace = (place) => {
        setQuery(place.display_name);
        setIsOpen(false);
        if (onPlaceSelect) {
            onPlaceSelect({
                name: place.display_name,
                lat: parseFloat(place.lat),
                lon: parseFloat(place.lon),
                boundingBox: place.boundingbox,
                type: place.type,
                address: place.address,
                osm_id: place.osm_id,
            });
        }
    };

    const handleInputChange = (e) => {
        setQuery(e.target.value);
        if (e.target.value.length <= 2) {
            setIsOpen(false);
        }
    };

    return (
        <DropdownContainer className={className} ref={dropdownRef}>
            <Input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                placeholder={placeholder}
            />
            
            {loading && (
                <LoadingSpinner>
                    <div className="spinner"></div>
                </LoadingSpinner>
            )}

            {isOpen && results.length > 0 && (
                <DropdownMenu>
                    {results.map((place, index) => (
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

export {PlaceSearchInput};