import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Form, FormGroup, Label, Input, Select, Button } from "../../styles/components";
import { PlaceSearchInput } from "../map-integration-components";
import { CarDetails, FlightDetails, haversineMiles } from "../leg-details-components";
import NodeSelect from "../common/NodeSelect";
import { placeToLegStart, placeToLegEnd } from "../../utils/places";

const TRANSPORT_TYPES = ["flight", "car", "train", "bus", "boat", "other"]; // consider centralizing

export default function LegForm({
  nodes = [],
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  saving = false,
}) {
  const [formData, setFormData] = useState(() => ({
    type: "",
    fromNode: "",
    toNode: "",
    date: "",
    notes: "",
    start_latitude: "",
    start_longitude: "",
    end_latitude: "",
    end_longitude: "",
    start_osm_name: "",
    start_osm_id: "",
    start_osm_country: "",
    start_osm_state: "",
    end_osm_name: "",
    end_osm_id: "",
    end_osm_country: "",
    end_osm_state: "",
    miles: "",
    flight_number: "",
    airline: "",
    start_airport: "",
    end_airport: "",
    driving_time_seconds: "",
    polyline: "",
    ...(initialValues || {}),
  }));

  useEffect(() => {
    setFormData(prev => ({ ...prev, ...(initialValues || {}) }));
  }, [initialValues]);

  const selectedFromNode = useMemo(() => nodes.find(n => String(n.id) === String(formData.fromNode)), [nodes, formData.fromNode]);
  const selectedToNode = useMemo(() => nodes.find(n => String(n.id) === String(formData.toNode)), [nodes, formData.toNode]);

  useEffect(() => {
    if (selectedFromNode) {
      setFormData(prev => ({
        ...prev,
        start_latitude: prev.start_latitude || selectedFromNode.latitude || "",
        start_longitude: prev.start_longitude || selectedFromNode.longitude || "",
        start_osm_name: prev.start_osm_name || selectedFromNode.osm_name || "",
        start_osm_id: prev.start_osm_id || selectedFromNode.osm_id || "",
        start_osm_country: prev.start_osm_country || selectedFromNode.osm_country || "",
        start_osm_state: prev.start_osm_state || selectedFromNode.osm_state || "",
        date: prev.date || (selectedFromNode.departure_date || ''),
      }));
    }
  }, [selectedFromNode]);

  useEffect(() => {
    if (selectedToNode) {
      setFormData(prev => ({
        ...prev,
        end_latitude: prev.end_latitude || selectedToNode.latitude || "",
        end_longitude: prev.end_longitude || selectedToNode.longitude || "",
        end_osm_name: prev.end_osm_name || selectedToNode.osm_name || "",
        end_osm_id: prev.end_osm_id || selectedToNode.osm_id || "",
        end_osm_country: prev.end_osm_country || selectedToNode.osm_country || "",
        end_osm_state: prev.end_osm_state || selectedToNode.osm_state || "",
      }));
    }
  }, [selectedToNode]);

  // Auto-calc miles for non-car, non-bus, non-flight legs using the same haversine used by FlightDetails
  useEffect(() => {
    const type = (formData.type || '').toLowerCase();
    if (!type || type === 'car' || type === 'bus' || type === 'flight') return;

    const lat1 = parseFloat(formData.start_latitude);
    const lon1 = parseFloat(formData.start_longitude);
    const lat2 = parseFloat(formData.end_latitude);
    const lon2 = parseFloat(formData.end_longitude);

    if (![lat1, lon1, lat2, lon2].every(v => Number.isFinite(v))) return;

    const miles = haversineMiles(lat1, lon1, lat2, lon2);
    setFormData(prev => {
      // Don't override if user has already provided a miles value
      if (prev.miles !== "" && prev.miles !== null && typeof prev.miles !== 'undefined') return prev;
      return { ...prev, miles: miles.toFixed(1) };
    });
  }, [formData.type, formData.start_latitude, formData.start_longitude, formData.end_latitude, formData.end_longitude]);

  const handleCarAutoFill = useCallback(({ miles, driving_time_seconds, polyline }) => {
    setFormData(prev => ({
      ...prev,
      ...(typeof miles === 'number' ? { miles: miles.toFixed(1) } : {}),
      ...(driving_time_seconds !== undefined ? { driving_time_seconds } : {}),
      ...(polyline !== undefined ? { polyline } : {}),
    }));
  }, []);

  const handleFlightAutoFill = useCallback((data) => {
    const { miles, flight_number, airline, start_airport, end_airport } = data || {};
    setFormData(prev => ({
      ...prev,
      ...(typeof miles === 'number' ? { miles: miles.toFixed(1) } : {}),
      ...(flight_number !== undefined ? { flight_number } : {}),
      ...(airline !== undefined ? { airline } : {}),
      ...(start_airport !== undefined ? { start_airport } : {}),
      ...(end_airport !== undefined ? { end_airport } : {}),
    }));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const submit = (e) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  return (
    <Form onSubmit={submit}>
      <FormGroup>
        <Label htmlFor="type">Transport Type *</Label>
        <Select id="type" name="type" value={formData.type} onChange={handleChange} required>
          <option value="">Select Transport Type</option>
          {TRANSPORT_TYPES.map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
        </Select>
      </FormGroup>

      <FormGroup>
        <Label htmlFor="fromNode">From Node *</Label>
        <NodeSelect id="fromNode" name="fromNode" nodes={nodes} value={formData.fromNode} onChange={handleChange} required />
      </FormGroup>

      <FormGroup>
        <Label htmlFor="toNode">To Node *</Label>
        <NodeSelect id="toNode" name="toNode" nodes={nodes} value={formData.toNode} onChange={handleChange} required />
      </FormGroup>

      <FormGroup>
        <Label htmlFor="date">Date *</Label>
        <Input id="date" name="date" type="date" value={formData.date} onChange={handleChange} required />
      </FormGroup>

      <FormGroup>
        <Label>From Location</Label>
        <PlaceSearchInput
          placeholder="Search for a start location..."
          value={formData.start_osm_name || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, start_osm_name: e.target.value }))}
          onPlaceSelect={(place) => setFormData(prev => ({ ...prev, ...placeToLegStart(place) }))}
        />
        <small>Autofilled from node; you can override.</small>
      </FormGroup>

      <FormGroup>
        <Label>To Location</Label>
        <PlaceSearchInput
          placeholder="Search for a destination..."
          value={formData.end_osm_name || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, end_osm_name: e.target.value }))}
          onPlaceSelect={(place) => setFormData(prev => ({ ...prev, ...placeToLegEnd(place) }))}
        />
        <small>Autofilled from node; you can override.</small>
      </FormGroup>

  {(formData.type === 'car' || formData.type === 'bus') && (
        <FormGroup>
          <CarDetails
            start={{ lat: Number(formData.start_latitude), lon: Number(formData.start_longitude) }}
            end={{ lat: Number(formData.end_latitude), lon: Number(formData.end_longitude) }}
            initialMiles={formData.miles ? Number(formData.miles) : undefined}
            onAutoFill={handleCarAutoFill}
          />
        </FormGroup>
      )}

      <FormGroup>
        <Label htmlFor="miles">Miles</Label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Input id="miles" name="miles" type="number" step="0.1" value={formData.miles} onChange={handleChange} style={{ flex: 1 }} />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const lat1 = parseFloat(formData.start_latitude);
              const lon1 = parseFloat(formData.start_longitude);
              const lat2 = parseFloat(formData.end_latitude);
              const lon2 = parseFloat(formData.end_longitude);
              if (![lat1, lon1, lat2, lon2].every(v => Number.isFinite(v))) return;
              const miles = haversineMiles(lat1, lon1, lat2, lon2);
              setFormData(prev => ({ ...prev, miles: miles.toFixed(1) }));
            }}
            disabled={saving || ![parseFloat(formData.start_latitude), parseFloat(formData.start_longitude), parseFloat(formData.end_latitude), parseFloat(formData.end_longitude)].every(v => Number.isFinite(v))}
            aria-label="Auto-calc miles"
            title="Auto-calc miles from coordinates"
          >↺</Button>
        </div>
      </FormGroup>

      {formData.type === 'flight' && (
        <FormGroup>
          <FlightDetails
            start={{ lat: Number(formData.start_latitude), lon: Number(formData.start_longitude) }}
            end={{ lat: Number(formData.end_latitude), lon: Number(formData.end_longitude) }}
            initialFlightNumber={formData.flight_number}
            initialAirline={formData.airline}
            initialStartAirport={formData.start_airport}
            initialEndAirport={formData.end_airport}
            onAutoFill={handleFlightAutoFill}
          />
        </FormGroup>
      )}

      <FormGroup>
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" as="textarea" rows={4} placeholder="Any additional notes about this leg..." value={formData.notes} onChange={handleChange} />
      </FormGroup>

      <div style={{ display: 'flex', gap: 12 }}>
        {onCancel && (<Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>)}
        <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : submitLabel}</Button>
      </div>
    </Form>
  );
}
