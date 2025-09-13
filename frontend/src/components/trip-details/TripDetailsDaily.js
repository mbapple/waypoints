import React, { useMemo } from "react";
import { TripInfoCard, EmptyState, TravelGroupCard } from "./trip-detail-components";
import { Flex, Text, Badge, Button } from "../../styles/components";
import NodeItem from "./NodeItem";
import LegItem from "./LegItem";
import InvisibleNodeItem from "./InvisibleNodeItem";

// Lightweight stay indicator card (uses NodeCard styling for consistency)
function StayCard({ node, stops = [], tripID, expanded, setExpanded, entityPhotos, setEntityPhotos, hideDates }) {
  return (
    <NodeItem
      node={node}
      tripID={tripID}
      expanded={expanded}
      setExpanded={setExpanded}
      entityPhotos={entityPhotos}
      setEntityPhotos={setEntityPhotos}
      stops={stops}
  hideDates={hideDates}
    />
  );
}

// Build ordered day columns: show stays first, then for each visible node chain outbound legs,
// grouping sequences that traverse invisible nodes exactly like list view's travel-group.
function buildDayColumns(trip, nodes, legs) {
  if (!trip) return [];
  const start = new Date(trip.start_date);
  const end = new Date(trip.end_date);
  if (isNaN(start) || isNaN(end)) return [];
  const dayMs = 86400000;
  const dateKeys = [];
  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + dayMs)) {
    dateKeys.push(d.toISOString().slice(0,10));
  }

  // Index helpers
  const nodeById = new Map(nodes.map(n => [n.id, n]));
  const legsByDate = new Map();
  legs.forEach(l => { if (l.date) { if(!legsByDate.has(l.date)) legsByDate.set(l.date, []); legsByDate.get(l.date).push(l); } });
  // Sort legs per day by id / date for deterministic order
  for (const arr of legsByDate.values()) arr.sort((a,b)=> (new Date(a.date||0)) - (new Date(b.date||0)) || a.id - b.id);

  // Visible nodes ordered by arrival_date (fallback departure) like list view
  const visibleNodesChrono = [...nodes]
    .filter(n => !n.invisible)
    .sort((a,b)=> {
      const ad = new Date(a.arrival_date || a.departure_date || '2100-01-01');
      const bd = new Date(b.arrival_date || b.departure_date || '2100-01-01');
      if (ad.getTime() !== bd.getTime()) return ad - bd;
      // Same base date: prioritize pure departure-only nodes (no arrival_date, has departure_date)
      const aDepartureOnly = !a.arrival_date && !!a.departure_date;
      const bDepartureOnly = !b.arrival_date && !!b.departure_date;
      if (aDepartureOnly && !bDepartureOnly) return -1;
      if (!aDepartureOnly && bDepartureOnly) return 1;
      return (a.id || 0) - (b.id || 0);
    });

  // Build leg adjacency from start_node_id -> legs (already ordered per date later)
  const legsByStart = new Map();
  for (const l of legs) {
    if (!legsByStart.has(l.start_node_id)) legsByStart.set(l.start_node_id, []);
    legsByStart.get(l.start_node_id).push(l);
  }

  // Day assembly
  return dateKeys.map((dateKey, idx) => {
    const dayItems = [];
    const dayLegs = (legsByDate.get(dateKey) || []).slice(); // legs occurring this day
    const consumedLegIds = new Set();

    // Ongoing stays (node spanning this date excluding arrival/departure day)
    const stayNodes = nodes.filter(n => n.arrival_date && n.departure_date && n.arrival_date < dateKey && n.departure_date > dateKey);
    stayNodes.sort((a,b)=> new Date(a.arrival_date) - new Date(b.arrival_date));
    stayNodes.forEach(n => dayItems.push({ kind: 'stay', node: n }));

    // Helper to compute travel chain starting at firstLeg possibly through invisible nodes until next visible
    function buildTravelGroup(firstLeg) {
      let currentLeg = firstLeg;
      let foundInvisible = false;
      const sequence = [];
      let endVisible = null;
      let safety = 0;
      while (currentLeg && safety++ < 100) {
        sequence.push({ type: 'leg', leg: currentLeg });
        consumedLegIds.add(currentLeg.id);
        const nextNode = nodeById.get(currentLeg.end_node_id);
        if (!nextNode) break;
        if (nextNode.invisible) {
          foundInvisible = true;
            sequence.push({ type: 'node', node: nextNode });
          // find next outbound leg from this invisible node happening SAME day
          const nextLeg = dayLegs.find(l => !consumedLegIds.has(l.id) && l.start_node_id === nextNode.id);
          if (!nextLeg) break;
          currentLeg = nextLeg;
        } else {
          endVisible = nextNode;
          break;
        }
      }
      return { foundInvisible, endVisible, sequence };
    }

    // Determine which visible nodes are relevant this day (arrival/departure/stay boundaries or leg endpoints)
    const visibleOnDaySet = new Set();
    visibleNodesChrono.forEach(n => {
      if (
        n.arrival_date === dateKey ||
        n.departure_date === dateKey ||
        (n.arrival_date && n.departure_date && n.arrival_date < dateKey && n.departure_date > dateKey)
      ) visibleOnDaySet.add(n.id);
    });
    dayLegs.forEach(l => { if(nodeById.get(l.start_node_id)?.invisible===false) visibleOnDaySet.add(l.start_node_id); if(nodeById.get(l.end_node_id)?.invisible===false) visibleOnDaySet.add(l.end_node_id); });

    // Iterate visible nodes in chronological order, emit node and travel out of it for legs of this date
    for (const visNode of visibleNodesChrono) {
      if (!visibleOnDaySet.has(visNode.id)) continue;

      // Node appearance classification
      const isArrival = visNode.arrival_date === dateKey;
      const isDeparture = visNode.departure_date === dateKey;
      const isSingleDay = visNode.arrival_date && visNode.departure_date && visNode.arrival_date === visNode.departure_date && visNode.arrival_date === dateKey;
      let singleType = null; let eventType = null;
      if (isSingleDay) singleType = 'single-day';
      else if (isArrival && !isDeparture) singleType = 'arrival-only';
      else if (isDeparture && !isArrival) singleType = 'departure-only';
      if (isArrival && !isDeparture) eventType = 'arrival';
      else if (isDeparture && !isArrival) eventType = 'departure';

      // Avoid duplicate: if already added as stay earlier (spanning) skip adding separate node for pure span day
      const spanOnly = !isArrival && !isDeparture && visNode.arrival_date && visNode.departure_date && visNode.arrival_date < dateKey && visNode.departure_date > dateKey;
      if (!spanOnly) {
        dayItems.push({ kind: 'node', node: visNode, singleType, eventType });
      }

      // Outbound legs starting from this visible node on this date not yet consumed
      const outboundToday = dayLegs.filter(l => l.start_node_id === visNode.id && !consumedLegIds.has(l.id));
      for (const firstLeg of outboundToday) {
        if (consumedLegIds.has(firstLeg.id)) continue;
        const { foundInvisible, endVisible, sequence } = buildTravelGroup(firstLeg);
        if (foundInvisible && endVisible) {
          dayItems.push({ kind: 'travel-group', fromNode: visNode, toNode: endVisible, sequence });
        } else if (!foundInvisible) {
          dayItems.push({ kind: 'leg', leg: firstLeg });
        } else {
          // chain ended without reaching visible; just push raw sequence
          sequence.forEach(seg => {
            if (seg.type === 'leg') dayItems.push({ kind: 'leg', leg: seg.leg });
            else dayItems.push({ kind: 'invisible-node', node: seg.node });
          });
        }
      }
    }

    // Any remaining legs (e.g., between invisible nodes only) add them in order
    dayLegs.forEach(l => {
      if (!consumedLegIds.has(l.id)) dayItems.push({ kind: 'leg', leg: l });
    });

    return { date: dateKey, dayNumber: idx + 1, items: dayItems };
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
    
    return stops.filter(s => {
      if (s.node_id !== nodeID) return false;
      if (!s.start_date && !s.end_date) {
        // undated: show only first node date as before
        return date === firstNodeDate;
      }
      // If only start_date, treat as single day
      if (s.start_date && !s.end_date) return s.start_date === date;
      if (!s.start_date && s.end_date) return s.end_date === date; // unlikely but safe
      // Both start & end: include inclusive range
      return s.start_date <= date && s.end_date >= date;
    });
  };

  const getStopsForLegOnDate = (legID, date) => {
    const leg = legs.find(l => l.id === legID);
    return stops.filter(s => {
      if (s.leg_id !== legID) return false;
      if (!s.start_date && !s.end_date) return leg && leg.date === date; // legacy undated stop: show on leg date
      if (s.start_date && !s.end_date) return s.start_date === date;
      if (!s.start_date && s.end_date) return s.end_date === date;
      return s.start_date <= date && s.end_date >= date;
    });
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
                      hideDates
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
                        hideDates
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
                        hideDates
                      />
                    </div>
                  );
                }
                if (item.kind === 'travel-group') {
                  const groupKey = `group:${item.fromNode.id}-${item.toNode.id}:${day.date}`;
                  const isOpen = dayExpansion.expanded[groupKey];
                  return (
                    <TravelGroupCard key={`tg-${item.fromNode.id}-${item.toNode.id}-${day.date}-${idx}`}>
                      <Flex justify="space-between" align="center">
                        <h4 style={{ margin: 0 }}>Travel from {item.fromNode.name} to {item.toNode.name}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dayExpansion.setExpanded(prev => ({ ...prev, [groupKey]: !prev[groupKey] }))}
                        >
                          {isOpen ? '▴' : '▾'}
                        </Button>
                      </Flex>
                      {isOpen && (
                        <div style={{ marginTop: '0.5rem', display: 'grid', gap: '0.5rem' }}>
                          {item.sequence.map((seg, sidx) => seg.type === 'leg' ? (
                            <LegItem
                              key={`tg-leg-${sidx}-${seg.leg.id}`}
                              leg={seg.leg}
                              tripID={tripID}
                              getNodeName={getNodeName}
                              expanded={dayExpansion.expanded}
                              setExpanded={dayExpansion.setExpanded}
                              entityPhotos={entityPhotos}
                              setEntityPhotos={setEntityPhotos}
                              stops={getStopsForLegOnDate(seg.leg.id, day.date)}
                              onEntityClick={onEntityClick}
                              hideDates
                            />
                          ) : (
                            <InvisibleNodeItem
                              key={`tg-node-${sidx}-${seg.node.id}`}
                              node={seg.node}
                              tripID={tripID}
                              expanded={dayExpansion.expanded}
                              setExpanded={dayExpansion.setExpanded}
                              entityPhotos={entityPhotos}
                              setEntityPhotos={setEntityPhotos}
                              onEntityClick={onEntityClick}
                              hideDates
                            />
                          ))}
                        </div>
                      )}
                    </TravelGroupCard>
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
                      hideDates
                    />
                  );
                }
                if (item.kind === 'invisible-node') {
                  return (
                    <InvisibleNodeItem
                      key={`invnode-${item.node.id}-${day.date}`}
                      node={item.node}
                      tripID={tripID}
                      expanded={dayExpansion.expanded}
                      setExpanded={dayExpansion.setExpanded}
                      entityPhotos={entityPhotos}
                      setEntityPhotos={setEntityPhotos}
                      onEntityClick={onEntityClick}
                      hideDates
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
