import React from "react";
import NodeItem from "./NodeItem";
import LegItem from "./LegItem";
import InvisibleNodeItem from "./InvisibleNodeItem";
import { TravelGroupCard, EmptyState } from "./trip-detail-components";
import { Grid, Flex, Button, Text } from "../../styles/components";

/**
 * TripDetailsList
 * Renders the existing itinerary list view with grouping of legs passing through invisible nodes.
 */
function TripDetailsList({ tripID, nodes, legs, stops, expanded, setExpanded, entityPhotos, setEntityPhotos, onEntityClick }) {
  const getNodeName = (nodeID) => {
    const node = nodes.find(n => n.id === nodeID);
    return node ? node.name : `Node ${nodeID}`;
  };

  const getStopsForLeg = (legID) => stops.filter(stop => stop.leg_id === legID);
  const getStopsForNode = (nodeID) => stops.filter(stop => stop.node_id === nodeID);

  // Build itinerary entries that group legs passing through invisible nodes between two visible nodes.
  const buildItinerary = () => {
    const entries = [];
    const nodeByIdMap = new Map(nodes.map(n => [n.id, n]));
    const legsByStart = new Map();
    for (const l of legs) {
      if (!legsByStart.has(l.start_node_id)) legsByStart.set(l.start_node_id, []);
      legsByStart.get(l.start_node_id).push(l);
    }
    for (const list of legsByStart.values()) {
      list.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
    }
    const visibleNodes = [...nodes]
      .sort((a, b) => new Date(a.arrival_date) - new Date(b.arrival_date))
      .filter(n => !n.invisible);
    const consumedLegIds = new Set();

    for (const start of visibleNodes) {
      entries.push({ kind: 'node', node: start });

      const outLegs = legsByStart.get(start.id) || [];
      for (const firstLeg of outLegs) {
        if (consumedLegIds.has(firstLeg.id)) continue;

        let currentLeg = firstLeg;
        let foundInvisible = false;
        let endVisible = null;
        const sequence = [];
        let safety = 0;
        while (currentLeg && safety++ < 100) {
          sequence.push({ type: 'leg', leg: currentLeg });
            consumedLegIds.add(currentLeg.id);
          const nextNode = nodeByIdMap.get(currentLeg.end_node_id);
          if (!nextNode) break;
          if (nextNode.invisible) {
            foundInvisible = true;
            sequence.push({ type: 'node', node: nextNode });
            const nextLeg = (legsByStart.get(nextNode.id) || []).find(l => !consumedLegIds.has(l.id));
            if (!nextLeg) break;
            currentLeg = nextLeg;
          } else {
            endVisible = nextNode;
            break;
          }
        }

        if (foundInvisible && endVisible) {
          entries.push({ kind: 'travel-group', fromNode: start, toNode: endVisible, sequence });
        } else if (!foundInvisible) {
          entries.push({ kind: 'leg', leg: firstLeg });
        }
      }
    }
    return entries;
  };

  const itineraryWithGroups = buildItinerary();

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: '1.5rem' }}>
        <h2>Trip Itinerary</h2>
        <Text variant="muted">{nodes.length} {nodes.length === 1 ? 'destination' : 'destinations'}</Text>
      </Flex>
      {itineraryWithGroups.length === 0 ? (
        <EmptyState>
          <h3>No itinerary items yet</h3>
          <Text variant="muted">Start building your itinerary by adding your first destination!</Text>
        </EmptyState>
      ) : (
        <Grid columns={1}>
          {itineraryWithGroups.map((entry, idx) => (
            <div key={`entry-${idx}`}>
              {entry.kind === 'node' ? (
                <NodeItem
                  node={entry.node}
                  tripID={tripID}
                  expanded={expanded}
                  setExpanded={setExpanded}
                  entityPhotos={entityPhotos}
                  setEntityPhotos={setEntityPhotos}
                  stops={getStopsForNode(entry.node.id)}
                  onEntityClick={onEntityClick}
                />
              ) : entry.kind === 'leg' ? (
                <LegItem
                  leg={entry.leg}
                  tripID={tripID}
                  getNodeName={getNodeName}
                  expanded={expanded}
                  setExpanded={setExpanded}
                  entityPhotos={entityPhotos}
                  setEntityPhotos={setEntityPhotos}
                  stops={getStopsForLeg(entry.leg.id)}
                  onEntityClick={onEntityClick}
                />
              ) : entry.kind === 'travel-group' ? (
                <TravelGroupCard>
                  <Flex justify="space-between" align="center">
                    <h4>Travel from {entry.fromNode.name} to {entry.toNode.name}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpanded(prev => ({ ...prev, [
                        `group:${entry.fromNode.id}-${entry.toNode.id}`
                      ]: !prev[`group:${entry.fromNode.id}-${entry.toNode.id}`] }))}
                    >
                      {expanded[`group:${entry.fromNode.id}-${entry.toNode.id}`] ? '▴' : '▾'}
                    </Button>
                  </Flex>
                  {expanded[`group:${entry.fromNode.id}-${entry.toNode.id}`] && (
                    <div style={{ marginTop: '0.5rem', display: 'grid', gap: '0.5rem' }}>
                      {entry.sequence.map((seg, sidx) => (
                        seg.type === 'leg' ? (
                          <LegItem
                            key={`gleg-${sidx}-${seg.leg.id}`}
                            leg={seg.leg}
                            tripID={tripID}
                            getNodeName={getNodeName}
                            expanded={expanded}
                            setExpanded={setExpanded}
                            entityPhotos={entityPhotos}
                            setEntityPhotos={setEntityPhotos}
                            stops={getStopsForLeg(seg.leg.id)}
                            onEntityClick={onEntityClick}
                          />
                        ) : (
                          <InvisibleNodeItem
                            key={`gnode-${sidx}-${seg.node.id}`}
                            node={seg.node}
                            tripID={tripID}
                            expanded={expanded}
                            setExpanded={setExpanded}
                            entityPhotos={entityPhotos}
                            setEntityPhotos={setEntityPhotos}
                            onEntityClick={onEntityClick}
                          />
                        )
                      ))}
                    </div>
                  )}
                </TravelGroupCard>
              ) : null}
            </div>
          ))}
        </Grid>
      )}
    </div>
  );
}

export default TripDetailsList;
