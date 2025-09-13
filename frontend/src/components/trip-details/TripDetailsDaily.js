import React, { useMemo } from "react";
import { TripInfoCard, EmptyState } from "./trip-detail-components";
import { Flex, Text, Badge } from "../../styles/components";
import NodeItem from "./NodeItem";
import LegItem from "./LegItem";
import InvisibleNodeItem from "./InvisibleNodeItem";

// Lightweight stay indicator card (uses NodeCard styling for consistency)
function StayCard({ node, stops = [], tripID, expanded, setExpanded, entityPhotos, setEntityPhotos }) {
  return (
    <NodeItem
      node={node}
      tripID={tripID}
      expanded={expanded}
      setExpanded={setExpanded}
      entityPhotos={entityPhotos}
      setEntityPhotos={setEntityPhotos}
      stops={stops}
    />
  );
}

// Build day -> ordered items (stay placeholders, legs in chain, arrival nodes)
function buildDayColumns(trip, nodes, legs) {
  if (!trip) return [];
  const start = new Date(trip.start_date);
  const end = new Date(trip.end_date);
  if (isNaN(start) || isNaN(end)) return [];
  const dayMs = 86400000;
  const dates = [];
  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + dayMs)) {
    dates.push(d.toISOString().slice(0,10));
  }

  // Sort nodes by arrival date to preserve chronological order like TripDetailsList
  const sortedNodes = [...nodes].sort((a, b) => {
    // For nodes appearing on the same day, prioritize departures over arrivals
    const aDate = new Date(a.departure_date || a.arrival_date || '1900-01-01');
    const bDate = new Date(b.departure_date || b.arrival_date || '1900-01-01');
    
    if (aDate.getTime() === bDate.getTime()) {
      // Same date - prioritize departure-only nodes (like "Home")
      const aIsDepartureOnly = !a.arrival_date && a.departure_date;
      const bIsDepartureOnly = !b.arrival_date && b.departure_date;
      
      if (aIsDepartureOnly && !bIsDepartureOnly) return -1;
      if (!aIsDepartureOnly && bIsDepartureOnly) return 1;
    }
    
    return aDate - bDate;
  });
  
  const legsByDate = new Map();
  legs.forEach(l => { if (l.date) { if (!legsByDate.has(l.date)) legsByDate.set(l.date, []); legsByDate.get(l.date).push(l); } });

  const chainLegs = (dayLegs) => {
    if (dayLegs.length <=1) return dayLegs;
    const remaining = [...dayLegs];
    const ordered = [];
    const endNodeIds = new Set(remaining.map(l => l.end_node_id));
    let current = remaining.find(l => !endNodeIds.has(l.start_node_id)) || remaining[0];
    while (current) {
      ordered.push(current);
      remaining.splice(remaining.indexOf(current),1);
      current = remaining.find(l => l.start_node_id === ordered[ordered.length-1].end_node_id);
    }
    if (remaining.length) { remaining.sort((a,b)=>a.id-b.id); ordered.push(...remaining); }
    return ordered;
  };

  return dates.map((date, idx) => {
    const dayLegs = chainLegs(legsByDate.get(date) || []);
    const items = [];
    
    // Add ongoing stays at the beginning
    const stayNodes = sortedNodes.filter(n => n.arrival_date && n.departure_date && n.arrival_date < date && n.departure_date > date);
    stayNodes.forEach(sn => items.push({ kind: 'stay', node: sn }));
    
    // Build a set of all nodes that appear on this day
    const nodesOnThisDay = new Set();
    
    // Track nodes that appear as arrivals
    sortedNodes.forEach(n => {
      if (n.arrival_date === date) nodesOnThisDay.add(n.id);
    });
    
    // Track nodes that appear as departures
    sortedNodes.forEach(n => {
      if (n.departure_date === date) nodesOnThisDay.add(n.id);
    });
    
    // Track nodes connected to legs on this day
    dayLegs.forEach(leg => {
      nodesOnThisDay.add(leg.start_node_id);
      nodesOnThisDay.add(leg.end_node_id);
    });
    
    // Process in chronological order from sortedNodes, prioritizing departures
    const processedNodes = new Set();
    
    // First pass: Handle all departures (like "Home")
    sortedNodes.forEach(node => {
      if (!nodesOnThisDay.has(node.id) || processedNodes.has(node.id)) return;
      
      const appearsAsDeparture = node.departure_date === date;
      const appearsAsArrival = node.arrival_date === date;
      
      // Only process departures in this pass
      if (appearsAsDeparture && !appearsAsArrival) {
        const singleType = !node.arrival_date && node.departure_date ? 'departure-only' : null;
        items.push({ kind: 'node', node, singleType, eventType: 'departure' });
        processedNodes.add(node.id);
        
        // Add any legs that start from this node
        const outboundLegs = dayLegs.filter(leg => leg.start_node_id === node.id);
        outboundLegs.forEach(leg => {
          items.push({ kind: 'leg', leg });
          
          // Add destination node if it arrives today
          const endNode = sortedNodes.find(n => n.id === leg.end_node_id);
          if (endNode && endNode.arrival_date === date && !processedNodes.has(endNode.id)) {
            const singleType = endNode.arrival_date && !endNode.departure_date ? 'arrival-only' : 
                              (endNode.arrival_date && endNode.departure_date && endNode.arrival_date === endNode.departure_date ? 'single-day' : null);
            items.push({ kind: 'node', node: endNode, singleType, eventType: 'arrival' });
            processedNodes.add(endNode.id);
          }
        });
      }
    });
    
    // Second pass: Handle remaining arrivals and same-day nodes
    sortedNodes.forEach(node => {
      if (!nodesOnThisDay.has(node.id) || processedNodes.has(node.id)) return;
      
      const appearsAsArrival = node.arrival_date === date;
      
      if (appearsAsArrival) {
        const singleType = node.arrival_date && !node.departure_date ? 'arrival-only' : 
                          (node.arrival_date && node.departure_date && node.arrival_date === node.departure_date ? 'single-day' : null);
        items.push({ kind: 'node', node, singleType, eventType: 'arrival' });
        processedNodes.add(node.id);
      }
    });
    
    // Add any remaining legs and nodes that weren't processed above
    dayLegs.forEach(leg => {
      // Skip if already added
      if (items.find(item => item.kind === 'leg' && item.leg.id === leg.id)) return;
      
      const startNode = sortedNodes.find(n => n.id === leg.start_node_id);
      const endNode = sortedNodes.find(n => n.id === leg.end_node_id);
      
      // Add start node as stay if needed
      if (startNode && !processedNodes.has(startNode.id) && 
          startNode.arrival_date && new Date(startNode.arrival_date) < new Date(date)) {
        items.push({ kind: 'stay', node: startNode });
        processedNodes.add(startNode.id);
      }
      
      items.push({ kind: 'leg', leg });
      
      // Add end node if arriving today
      if (endNode && endNode.arrival_date === date && !processedNodes.has(endNode.id)) {
        const singleType = endNode.arrival_date && !endNode.departure_date ? 'arrival-only' : 
                          (endNode.arrival_date && endNode.departure_date && endNode.arrival_date === endNode.departure_date ? 'single-day' : null);
        items.push({ kind: 'node', node: endNode, singleType, eventType: 'arrival' });
        processedNodes.add(endNode.id);
      }
    });

    return { date, dayNumber: idx+1, items };
  });
}

function TripDetailsDaily({ trip, tripID, nodes, legs, stops, expanded, setExpanded, entityPhotos, setEntityPhotos, onEntityClick }) {
  const dayColumns = useMemo(() => buildDayColumns(trip, nodes, legs), [trip, nodes, legs]);
  const getNodeName = (id) => nodes.find(n => n.id === id)?.name || `Node ${id}`;

  // Create day-specific expansion handlers
  const createDayExpansion = (date) => ({
    expanded: Object.fromEntries(
      Object.entries(expanded).filter(([key]) => key.startsWith(`${date}:`)).map(([key, value]) => [key.replace(`${date}:`, ''), value])
    ),
    setExpanded: (updater) => {
      setExpanded(prev => {
        const update = typeof updater === 'function' ? updater(createDayExpansion(date).expanded) : updater;
        const newState = { ...prev };
        
        // Remove old entries for this date
        Object.keys(newState).forEach(key => {
          if (key.startsWith(`${date}:`)) delete newState[key];
        });
        
        // Add new entries with date prefix
        Object.entries(update).forEach(([key, value]) => {
          newState[`${date}:${key}`] = value;
        });
        
        return newState;
      });
    }
  });

  const getStopsForNodeOnDate = (nodeID, date) => {
    const node = nodes.find(n => n.id === nodeID);
    if (!node) return [];
    
    // Check if node appears on this date
    const nodeAppearsToday = 
      node.arrival_date === date ||
      node.departure_date === date ||
      (node.arrival_date && node.departure_date && node.arrival_date < date && node.departure_date > date);
    
    if (!nodeAppearsToday) return [];
    
    // For undated stops, only show on the first day the node appears
    const firstNodeDate = node.arrival_date || node.departure_date;
    
    return stops.filter(s => s.node_id === nodeID && (
      s.start_date ? s.start_date === date : date === firstNodeDate  // Show undated stops only on first day
    ));
  };

  const getStopsForLegOnDate = (legID, date) => {
    const leg = legs.find(l => l.id === legID);
    return stops.filter(s => s.leg_id === legID && (
      s.start_date ? s.start_date === date : (leg && leg.date === date)
    ));
  };

  if (!dayColumns.length) {
    return (
      <EmptyState>
        <h3>No itinerary</h3>
        <Text variant="muted">Add nodes or legs to build the daily view.</Text>
      </EmptyState>
    );
  }

  return (
    <div style={{ overflowX: 'auto', display: 'flex', gap: '1.5rem', paddingBottom: '0.75rem', scrollSnapType: 'x mandatory' }}>
      {dayColumns.map(day => {
        const dayExpansion = createDayExpansion(day.date);
        return (
          <div key={day.date} style={{ minWidth: '340px', flex: '0 0 340px', display: 'flex', flexDirection: 'column', gap: '0.75rem', scrollSnapAlign: 'start' }}>
            <TripInfoCard style={{ marginBottom: 0 }}>
              <Flex justify="space-between" align="center">
                <h3 style={{ margin: 0 }}>Day {day.dayNumber}</h3>
                <Badge variant="primary">{day.date}</Badge>
              </Flex>
            </TripInfoCard>
            {day.items.length === 0 ? (
              <Text variant="muted" size="sm">No events.</Text>
            ) : (
              day.items.map((item, idx) => {
                if (item.kind === 'stay') {
                  return (
                    <StayCard 
                      key={`stay-${item.node.id}-${day.date}-${idx}`} 
                      node={item.node}
                      stops={getStopsForNodeOnDate(item.node.id, day.date)}
                      tripID={tripID}
                      expanded={dayExpansion.expanded}
                      setExpanded={dayExpansion.setExpanded}
                      entityPhotos={entityPhotos}
                      setEntityPhotos={setEntityPhotos}
                      onEntityClick={onEntityClick}
                    />
                  );
                }
                if (item.kind === 'node') {
                  if (item.node.invisible) {
                    return (
                      <InvisibleNodeItem
                        key={`node-${item.node.id}-${day.date}`}
                        node={item.node}
                        tripID={tripID}
                        expanded={dayExpansion.expanded}
                        setExpanded={dayExpansion.setExpanded}
                        entityPhotos={entityPhotos}
                        setEntityPhotos={setEntityPhotos}
                      />
                    );
                  }
                  const labelPrefix = item.singleType === 'arrival-only' ? 'Arriving at' : 
                                     (item.singleType === 'departure-only' ? 'Departing from' : 
                                     (item.eventType === 'departure' && !item.singleType ? 'Departing from' : null));
                  return (
                    <div key={`node-${item.node.id}-${day.date}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {labelPrefix && (
                        <Text size="xs" variant="secondary" style={{ paddingLeft: '0.25rem' }}>
                          {labelPrefix} {item.node.name}
                        </Text>
                      )}
                      <NodeItem
                        node={item.node}
                        tripID={tripID}
                        expanded={dayExpansion.expanded}
                        setExpanded={dayExpansion.setExpanded}
                        entityPhotos={entityPhotos}
                        setEntityPhotos={setEntityPhotos}
                        stops={getStopsForNodeOnDate(item.node.id, day.date)}
                        onEntityClick={onEntityClick}
                      />
                    </div>
                  );
                }
                if (item.kind === 'leg') {
                  return (
                    <LegItem
                      key={`leg-${item.leg.id}-${day.date}`}
                      leg={item.leg}
                      tripID={tripID}
                      getNodeName={getNodeName}
                      expanded={dayExpansion.expanded}
                      setExpanded={dayExpansion.setExpanded}
                      entityPhotos={entityPhotos}
                      setEntityPhotos={setEntityPhotos}
                      stops={getStopsForLegOnDate(item.leg.id, day.date)}
                      onEntityClick={onEntityClick}
                    />
                  );
                }
                return null;
              })
            )}
          </div>
        );
      })}
    </div>
  );
}

export default TripDetailsDaily;
