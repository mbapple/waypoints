// General styled comonents used across multiple pages in the app
import styled from 'styled-components';
import { Card, Text } from '../styles/components';
import { FormCard } from './input-components';

const PageHeader = styled.div`
  margin: ${props => props.theme.space[5]} 0 ${props => props.theme.space[4]} 0;

  h1 {
    margin-bottom: ${props => props.theme.space[1]};
  }

  /* Subtitle under the page title: a small muted line, not a second heading */
  h1 + ${Text} {
    display: block;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
  }

  /* Form pages: keep the title aligned with the centred form card below it */
  &:has(+ ${FormCard}) {
    max-width: 640px;
    margin-left: auto;
    margin-right: auto;
  }

  @media (max-width: ${props => props.theme.breakpoints.sm}) {
    margin: ${props => props.theme.space[4]} 0 ${props => props.theme.space[3]} 0;
  }
`;

const PageHeaderLeft = styled(PageHeader)`
  text-align: left;
`;

const PageHeaderCenter = styled(PageHeader)`
  text-align: center;
`;

// Page header for list pages: title (+ muted count) on the left, primary action on the right
const ListHeader = styled(PageHeader)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${props => props.theme.space[3]};
  flex-wrap: wrap;
`;

const ComingSoonCard = styled(Card)`
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
  padding: ${props => props.theme.space[8]};
`;

export { PageHeader, ListHeader, ComingSoonCard };
