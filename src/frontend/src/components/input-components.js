// File: frontend/src/components/input-components.js
// UI componenets used across multiple input forms in the app
import styled from 'styled-components';
import { Card } from '../styles/components';

export const FormCard = styled(Card)`
    max-width: 600px;
    margin: 0 auto;
`;

export const ButtonGroup = styled.div`
    display: flex;
    gap: ${props => props.theme.space[3]};
    justify-content: flex-end;
    margin-top: ${props => props.theme.space[6]};

    @media (max-width: ${props => props.theme.breakpoints.sm}) {
        flex-direction: column;
    }
`;

export const DangerZone = styled(Card)`
  border-color: ${props => props.theme.colors.danger};
  background: rgba(239, 68, 68, 0.05);
  margin-top: ${props => props.theme.space[8]};
`;
