import React from "react";
import { Link } from "react-router-dom";
import { NodeCard } from "./trip-detail-components";
import { Button, Text, Flex, Badge } from "../../styles/components";
import { getPlaceLink } from "../map-integration-components";
import PhotoSlideshowSmall from "../photos/PhotoSlideshowSmall";

function NodeItemCard({ node, tripID, isExpanded, onToggle, photos }) {
  return (
    <NodeCard>
      <Flex justify="space-between" align="flex-start">
        <h4>{node.name}</h4>
        <Button
          as={Link}
          to={`/trip/${tripID}/update-node?nodeID=${node.id}`}
          variant="ghost"
          size="sm"
          aria-label={`Edit node ${node.name}`}
        >
          Edit
        </Button>
      </Flex>
      <Flex style={{ marginBottom: '1.0rem' }}>
        <Link to={getPlaceLink(node.osm_id, node.osm_name)} target="_blank" rel="noopener noreferrer">
          <Text variant="muted" size="sm">
            <strong>Location:</strong> (OSM: {node.osm_name || 'N/A'})
          </Text>
        </Link>
      </Flex>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Flex gap={3} align="center" style={{ marginBottom: '0.5rem' }}>
          <Badge variant="primary">{node.arrival_date}</Badge>
          <Text>→</Text>
          <Badge variant="primary">{node.departure_date}</Badge>
        </Flex>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
        >
          {isExpanded ? '▴ Collapse' : '▾ Expand'}
        </Button>
      </div>
      {isExpanded && (
        <div style={{ marginTop: '0.75rem' }}>
          {photos && photos.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <PhotoSlideshowSmall photos={photos} />
            </div>
          )}
          {node.description && (
            <Text variant="secondary" size="sm" style={{ marginBottom: '0.75rem' }}>
              {node.description}
            </Text>
          )}
          {node.notes && (
            <Text variant="muted" size="sm">
              <strong>Notes:</strong> {node.notes}
            </Text>
          )}
        </div>
      )}
    </NodeCard>
  );
}

export default NodeItemCard;
