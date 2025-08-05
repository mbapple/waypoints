// File: frontend/src/components/input-components.js
// UI componenets used across multiple input forms in the app
import styled from 'styled-components';
import { Card } from '../styles/components';

const FormCard = styled(Card)`
    max-width: 600px;
    margin: 0 auto;
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: ${props => props.theme.space[3]};
    justify-content: flex-end;
    margin-top: ${props => props.theme.space[6]};

    @media (max-width: ${props => props.theme.breakpoints.sm}) {
        flex-direction: column;
    }
`;

export {FormCard, ButtonGroup};