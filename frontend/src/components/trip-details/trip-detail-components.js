import styled from "styled-components";
import { Card, Flex } from "../../styles/components";
import { Link } from "react-router-dom";
import { Button } from "../../styles/components";


export const TripInfoCard = styled(Card)`
  margin-bottom: ${props => props.theme.space[8]};
`;

export const NodeCard = styled(Card)`
  transition: ${props => props.theme.transitions.base};
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: ${props => props.theme.shadows.lg};
  }
`;

export const LegCard = styled(Card)`
  transition: ${props => props.theme.transitions.base};
  margin-left: ${props => props.theme.space[8]};
  &:hover {
    transform: translateY(1px);
    box-shadow: ${props => props.theme.shadows.lg};
  }
`;

export const StopCard = styled(Card)`
  transition: ${props => props.theme.transitions.base};
  margin-left: ${props => props.theme.space[16]};
  &:hover {
    transform: translateY(1px);
    box-shadow: ${props => props.theme.shadows.lg};
  }
`;

export const ActionButtons = styled(Flex)`
  gap: ${props => props.theme.space[3]};
  margin: ${props => props.theme.space[6]} 0;
  
  @media (max-width: ${props => props.theme.breakpoints.sm}) {
    flex-direction: column;
  }
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: ${props => props.theme.space[12]} ${props => props.theme.space[8]};
  color: ${props => props.theme.colors.textMuted};
`;

export function AddButtons({ tripID, ...rest }) {
  return (
    <ActionButtons {...rest}>
      <Button
        as={Link}
        to={`/trip/${tripID}/add-node`}
        variant="primary"
      >
        + Add Node
      </Button>
      <Button
        as={Link}
        to={`/trip/${tripID}/add-leg`}
        variant="secondary"
      >
        + Add Leg
      </Button>
      <Button
        as={Link}
        to={`/trip/${tripID}/add-stop`}
        variant="primary"
      >
        + Add Stop
      </Button>
    </ActionButtons>
  );
}