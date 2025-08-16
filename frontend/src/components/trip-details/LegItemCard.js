import React from "react";
import { Link } from "react-router-dom";
import { LegCard } from "./trip-detail-components";
import { Button, Text, Flex, Badge } from "../../styles/components";
import { getTransportTypeLabel } from "../../utils/format";
import PhotoSlideshowSmall from "../photos/PhotoSlideshowSmall";

function LegItemCard({ leg, tripID, getNodeName, isExpanded, onToggle, photos }) {
  return (
    <LegCard>
      <>
        <Flex justify="space-between" align="flex-start">
          <h4>{leg.name || `${getTransportTypeLabel(leg.type)} ${getNodeName(leg.start_node_id)} to ${getNodeName(leg.end_node_id)}`}</h4>
          <Button
            as={Link}
            to={`/trip/${tripID}/update-leg?legID=${leg.id}`}
            variant="ghost"
            size="sm"
            aria-label={`Edit leg ${leg.id}`}
          >
            Edit
          </Button>
        </Flex>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Badge variant="primary">{leg.date}</Badge>
          </div>
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
            {leg.description && (
              <Text variant="secondary" size="sm" style={{ marginBottom: '0.75rem' }}>
                {leg.description}
              </Text>
            )}
            {leg.notes && (
              <Text variant="muted" size="sm">
                <strong>Notes:</strong> {leg.notes}
              </Text>
            )}
          </div>
        )}
      </>
    </LegCard>
  );
}

export default LegItemCard;
