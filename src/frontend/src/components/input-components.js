// File: frontend/src/components/input-components.js
// UI componenets used across multiple input forms in the app
import styled from 'styled-components';
import { Card, Text } from '../styles/components';

export const FormCard = styled(Card)`
    max-width: 640px;
    margin: 0 auto ${props => props.theme.space[4]};
    padding: ${props => props.theme.space[5]};

    &:hover {
        border-color: ${props => props.theme.colors.border};
        box-shadow: ${props => props.theme.shadows.sm};
    }

    @media (max-width: ${props => props.theme.breakpoints.sm}) {
        padding: ${props => props.theme.space[4]};
    }
`;

export const ButtonGroup = styled.div`
    display: flex;
    gap: ${props => props.theme.space[2]};
    justify-content: flex-end;
    margin-top: ${props => props.theme.space[4]};

    @media (max-width: ${props => props.theme.breakpoints.sm}) {
        flex-direction: column;
    }
`;

export const DangerZone = styled(Card)`
  border-color: ${props => props.theme.colors.danger};
  background: rgba(239, 68, 68, 0.05);
  max-width: 640px;
  margin: ${props => props.theme.space[4]} auto;

  &:hover {
    border-color: ${props => props.theme.colors.danger};
  }

  & > ${Text} {
    display: block;
  }
`;
