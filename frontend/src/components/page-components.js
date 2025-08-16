// General styled comonents used across multiple pages in the app
import styled from 'styled-components';
import { Card } from '../styles/components';



const PageHeader = styled.div`
  margin: ${props => props.theme.space[8]} 0 ${props => props.theme.space[6]} 0;
`;

const PageHeaderLeft = styled(PageHeader)`
  text-align: left;
`;

const PageHeaderCenter = styled(PageHeader)`
  text-align: center;
`;

const ComingSoonCard = styled(Card)`
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
  padding: ${props => props.theme.space[12]};
`;

export { PageHeader, ComingSoonCard };