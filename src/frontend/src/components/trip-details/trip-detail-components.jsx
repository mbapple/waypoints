import styled from "styled-components";
import { Card } from "../../styles/components";

// Card used for stop-like items outside the itinerary (e.g. AdventureDetails).
export const StopCard = styled(Card)`
  transition: ${props => props.theme.transitions.base};
  margin-left: ${props => props.theme.space[0]};
  &:hover {
    transform: translateY(1px);
    box-shadow: ${props => props.theme.shadows.lg};
  }
`;
