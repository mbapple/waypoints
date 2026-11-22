// Styled pieces shared by the Quick Create Trip components
import styled, { css } from 'styled-components';
import { Card, Input, Select } from '../../styles/components';

export const QuickForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.space[4]};
  max-width: 760px;
  margin: 0 auto;
`;

export const SectionCard = styled(Card)`
  margin-bottom: 0;
  padding: ${props => props.theme.space[5]};
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.space[4]};

  @media (max-width: ${props => props.theme.breakpoints.sm}) {
    padding: ${props => props.theme.space[4]};
  }

  ${props => props.$invalid && css`
    border-color: ${props.theme.colors.danger};
    &:hover { border-color: ${props.theme.colors.danger}; }
  `}
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${props => props.theme.space[3]};
  flex-wrap: wrap;

  h3 {
    margin: 0;
    font-size: ${props => props.theme.fontSizes.lg};
  }
`;

export const StopIndex = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.75rem;
  height: 1.75rem;
  padding: 0 ${props => props.theme.space[2]};
  margin-right: ${props => props.theme.space[2]};
  border-radius: ${props => props.theme.radii.full};
  background: ${props => props.theme.colors.primary};
  color: #fff;
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.semibold};
`;

// The leg between two stops: an indented connector with a line down its left
export const LegConnector = styled.div`
  position: relative;
  margin-left: ${props => props.theme.space[6]};
  padding: ${props => props.theme.space[4]} 0 ${props => props.theme.space[4]} ${props => props.theme.space[6]};
  border-left: 2px dashed ${props => (props.$invalid ? props.theme.colors.danger : props.theme.colors.borderLight)};
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.space[3]};

  @media (max-width: ${props => props.theme.breakpoints.sm}) {
    margin-left: ${props => props.theme.space[3]};
    padding-left: ${props => props.theme.space[4]};
  }
`;

export const LegTitle = styled.div`
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.semibold};
  color: ${props => props.theme.colors.textSecondary};
`;

export const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(${props => props.$cols || 2}, minmax(0, 1fr));
  gap: ${props => props.theme.space[3]};
  align-items: start;

  @media (max-width: ${props => props.theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
  }
`;

export const LabelRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.space[2]};
  min-height: 1.25rem;
`;

export const AutoTag = styled.span`
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => props.theme.colors.textMuted};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.radii.full};
  padding: 0 ${props => props.theme.space[2]};
  line-height: 1.4;
  white-space: nowrap;
`;

export const LinkButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => props.theme.colors.primary};
  cursor: pointer;
  &:hover { text-decoration: underline; }
`;

const autoValue = css`
  ${props => props.$auto && css`
    color: ${props.theme.colors.textSecondary};
    border-style: dashed;
  `}
  ${props => props.$invalid && css`
    border-color: ${props.theme.colors.danger};
  `}
`;

export const QInput = styled(Input)`${autoValue}`;
export const QSelect = styled(Select)`${autoValue}`;

export const FieldError = styled.span`
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => props.theme.colors.danger};
`;

export const Hint = styled.span`
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => props.theme.colors.textMuted};
`;

export const More = styled.details`
  summary {
    cursor: pointer;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
    user-select: none;
  }
  &[open] summary { margin-bottom: ${props => props.theme.space[3]}; }
  > div {
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.space[3]};
  }
`;

export const ErrorSummary = styled.div`
  border: 1px solid ${props => props.theme.colors.danger};
  background: rgba(239, 68, 68, 0.08);
  border-radius: ${props => props.theme.radii.md};
  padding: ${props => props.theme.space[3]} ${props => props.theme.space[4]};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.fontSizes.sm};

  ul { margin: ${props => props.theme.space[2]} 0 0; padding-left: ${props => props.theme.space[5]}; }
`;
