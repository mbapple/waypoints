import React from "react";
import { useParams, Link } from "react-router-dom";
import styled from "styled-components";
import { Card, Button, Text, Flex } from "../styles/components";

const PageHeader = styled.div`
  margin: ${props => props.theme.space[8]} 0 ${props => props.theme.space[6]} 0;
`;

const ComingSoonCard = styled(Card)`
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
  padding: ${props => props.theme.space[12]};
`;

function AddLeg() {
  const { tripID } = useParams();

  return (
    <div>
      <PageHeader>
        <Flex justify="space-between" align="flex-start" wrap>
          <div>
            <h1>Add Travel Leg</h1>
            <Text variant="secondary" size="lg">
              Add transportation between destinations
            </Text>
          </div>
          <Button as={Link} to={`/trip/${tripID}`} variant="outline">
            ← Back to Trip
          </Button>
        </Flex>
      </PageHeader>

      <ComingSoonCard>
        <h2>Coming Soon</h2>
        <Text variant="muted" style={{ marginBottom: '2rem' }}>
          The ability to add travel legs (flights, car trips, trains, etc.) is currently under development.
          This feature will allow you to track how you get from one destination to another.
        </Text>
        <Button as={Link} to={`/trip/${tripID}`} variant="primary">
          Back to Trip Details
        </Button>
      </ComingSoonCard>
    </div>
  );
}

export default AddLeg;