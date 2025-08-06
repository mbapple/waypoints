import styled, { createGlobalStyle } from 'styled-components';

// Global styles for the entire application
export const GlobalStyles = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  html {
    font-size: 16px;
    scroll-behavior: smooth;
  }
  
  body {
    font-family: ${props => props.theme.fonts.body};
    background-color: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text};
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
  }
  
  h1, h2, h3, h4, h5, h6 {
    font-family: ${props => props.theme.fonts.heading};
    font-weight: ${props => props.theme.fontWeights.semibold};
    line-height: 1.25;
    margin-bottom: ${props => props.theme.space[4]};
  }
  
  h1 {
    font-size: ${props => props.theme.fontSizes['3xl']};
    font-weight: ${props => props.theme.fontWeights.bold};
  }
  
  h2 {
    font-size: ${props => props.theme.fontSizes['2xl']};
  }
  
  h3 {
    font-size: ${props => props.theme.fontSizes.xl};
  }
  
  p {
    margin-bottom: ${props => props.theme.space[4]};
  }
  
  a {
    color: ${props => props.theme.colors.primary};
    text-decoration: none;
    transition: ${props => props.theme.transitions.fast};
    
    &:hover {
      color: ${props => props.theme.colors.primaryHover};
    }
  }
  
  ul, ol {
    margin-bottom: ${props => props.theme.space[4]};
    padding-left: ${props => props.theme.space[6]};
  }
  
  li {
    margin-bottom: ${props => props.theme.space[2]};
  }
  
  button {
    font-family: inherit;
    cursor: pointer;
    border: none;
    outline: none;
    transition: ${props => props.theme.transitions.fast};
  }
  
  input, textarea, select {
    font-family: inherit;
    outline: none;
  }
  
  /* Custom scrollbar for webkit browsers */
  ::-webkit-scrollbar {
    width: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: ${props => props.theme.colors.backgroundSecondary};
  }
  
  ::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.base};
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: ${props => props.theme.colors.borderLight};
  }
`;

// Common styled components

export const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${props => props.theme.space[6]};
  
  @media (max-width: ${props => props.theme.breakpoints.sm}) {
    padding: 0 ${props => props.theme.space[4]};
  }
`;

export const Card = styled.div`
  background: ${props => props.theme.colors.card};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.radii.lg};
  padding: ${props => props.theme.space[6]};
  box-shadow: ${props => props.theme.shadows.md};
  transition: ${props => props.theme.transitions.base};
  margin-bottom: ${props => props.theme.space[6]};
  
  &:hover {
    border-color: ${props => props.theme.colors.borderHover};
    box-shadow: ${props => props.theme.shadows.lg};
  }
`;

export const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${props => props.theme.space[3]} ${props => props.theme.space[6]};
  font-size: ${props => props.theme.fontSizes.base};
  font-weight: ${props => props.theme.fontWeights.medium};
  border-radius: ${props => props.theme.radii.md};
  transition: ${props => props.theme.transitions.fast};
  min-height: 44px;
  
  /* Variants */
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: ${props.theme.colors.primary};
          color: white;
          &:hover:not(:disabled) {
            background: ${props.theme.colors.primaryHover};
            transform: translateY(-1px);
            box-shadow: ${props.theme.shadows.glow};
          }
        `;
      case 'secondary':
        return `
          background: ${props.theme.colors.secondary};
          color: white;
          &:hover:not(:disabled) {
            background: ${props.theme.colors.secondaryHover};
            transform: translateY(-1px);
          }
        `;
      case 'success':
        return `
          background: ${props.theme.colors.success};
          color: white;
          &:hover:not(:disabled) {
            background: ${props.theme.colors.successHover};
            transform: translateY(-1px);
          }
        `;
      case 'danger':
        return `
          background: ${props.theme.colors.danger};
          color: white;
          &:hover:not(:disabled) {
            background: ${props.theme.colors.dangerHover};
            transform: translateY(-1px);
          }
        `;
      case 'outline':
        return `
          background: transparent;
          color: ${props.theme.colors.text};
          border: 1px solid ${props.theme.colors.border};
          &:hover:not(:disabled) {
            background: ${props.theme.colors.surfaceHover};
            border-color: ${props.theme.colors.borderHover};
          }
        `;
      case 'ghost':
        return `
          background: transparent;
          color: ${props.theme.colors.text};
          &:hover:not(:disabled) {
            background: ${props.theme.colors.surfaceHover};
          }
        `;
      default:
        return `
          background: ${props.theme.colors.surface};
          color: ${props.theme.colors.text};
          border: 1px solid ${props.theme.colors.border};
          &:hover:not(:disabled) {
            background: ${props.theme.colors.surfaceHover};
          }
        `;
    }
  }}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* Sizes */
  ${props => {
    switch (props.size) {
      case 'sm':
        return `
          padding: ${props.theme.space[2]} ${props.theme.space[4]};
          font-size: ${props.theme.fontSizes.sm};
          min-height: 36px;
        `;
      case 'lg':
        return `
          padding: ${props.theme.space[4]} ${props.theme.space[8]};
          font-size: ${props.theme.fontSizes.lg};
          min-height: 52px;
        `;
      default:
        return '';
    }
  }}
`;

export const Input = styled.input`
  width: 100%;
  padding: ${props => props.theme.space[3]};
  font-size: ${props => props.theme.fontSizes.base};
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.radii.md};
  color: ${props => props.theme.colors.text};
  transition: ${props => props.theme.transitions.fast};
  min-height: 44px;
  
  &::placeholder {
    color: ${props => props.theme.colors.textMuted};
  }
  
  &:focus {
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const DropdownContainer = styled.div`
  position: relative;
  width: 100%;
`;

export const DropdownMenu = styled.div`
  position: absolute;
  z-index: 50;
  width: 100%;
  margin-top: ${props => props.theme.space[1]};
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.radii.md};
  box-shadow: ${props => props.theme.shadows.lg};
  max-height: 240px;
  overflow-y: auto;
  
  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${props => props.theme.colors.backgroundSecondary};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.base};
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${props => props.theme.colors.borderLight};
  }
`;

export const DropdownItem = styled.div`
  padding: ${props => props.theme.space[3]};
  cursor: pointer;
  border-bottom: 1px solid ${props => props.theme.colors.backgroundSecondary};
  transition: ${props => props.theme.transitions.fast};
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
  }
  
  .primary-text {
    font-weight: ${props => props.theme.fontWeights.medium};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    margin-bottom: ${props => props.theme.space[1]};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .secondary-text {
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

export const LoadingSpinner = styled.div`
  position: absolute;
  right: ${props => props.theme.space[3]};
  top: 50%;
  transform: translateY(-50%);
  
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid ${props => props.theme.colors.border};
    border-top-color: ${props => props.theme.colors.primary};
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export const Select = styled.select`
    width: 100%;
    padding: ${props => props.theme.space[3]};
    font-size: ${props => props.theme.fontSizes.base};
    background: ${props => props.theme.colors.surface};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    color: ${props => props.theme.colors.text};
    transition: ${props => props.theme.transitions.fast};
    min-height: 44px;
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
    background-position: right ${props => props.theme.space[3]} center;
    background-repeat: no-repeat;
    background-size: 16px;
    padding-right: ${props => props.theme.space[10]};
    
    &:focus {
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }
    
    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    option {
        background: ${props => props.theme.colors.surface};
        color: ${props => props.theme.colors.text};
    }
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.space[4]};
  max-width: 500px;
  margin: 0 auto;
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.space[2]};
`;

export const Label = styled.label`
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.medium};
  color: ${props => props.theme.colors.textSecondary};
`;

export const NavLink = styled.a`
  display: inline-flex;
  align-items: center;
  padding: ${props => props.theme.space[2]} ${props => props.theme.space[4]};
  color: ${props => props.theme.colors.textSecondary};
  font-weight: ${props => props.theme.fontWeights.medium};
  border-radius: ${props => props.theme.radii.md};
  transition: ${props => props.theme.transitions.fast};
  
  &:hover {
    color: ${props => props.theme.colors.text};
    background: ${props => props.theme.colors.surfaceHover};
  }
  
  &.active {
    color: ${props => props.theme.colors.primary};
    background: rgba(99, 102, 241, 0.1);
  }
`;

export const Grid = styled.div`
  display: grid;
  gap: ${props => props.theme.space[6]};
  
  ${props => {
    switch (props.columns) {
      case 2:
        return `
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        `;
      case 3:
        return `
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        `;
      default:
        return `
          grid-template-columns: 1fr;
        `;
    }
  }}
`;

export const Flex = styled.div`
  display: flex;
  align-items: ${props => props.align || 'stretch'};
  justify-content: ${props => props.justify || 'flex-start'};
  gap: ${props => props.gap ? props.theme.space[props.gap] : '0'};
  flex-wrap: ${props => props.wrap ? 'wrap' : 'nowrap'};
  flex-direction: ${props => props.direction || 'row'};
`;

export const Text = styled.span`
  color: ${props => {
    switch (props.variant) {
      case 'muted':
        return props.theme.colors.textMuted;
      case 'secondary':
        return props.theme.colors.textSecondary;
      case 'primary':
        return props.theme.colors.primary;
      case 'success':
        return props.theme.colors.success;
      case 'warning':
        return props.theme.colors.warning;
      case 'danger':
        return props.theme.colors.danger;
      default:
        return props.theme.colors.text;
    }
  }};
  
  font-size: ${props => {
    switch (props.size) {
      case 'xs':
        return props.theme.fontSizes.xs;
      case 'sm':
        return props.theme.fontSizes.sm;
      case 'lg':
        return props.theme.fontSizes.lg;
      case 'xl':
        return props.theme.fontSizes.xl;
      default:
        return props.theme.fontSizes.base;
    }
  }};
  
  font-weight: ${props => {
    switch (props.weight) {
      case 'medium':
        return props.theme.fontWeights.medium;
      case 'semibold':
        return props.theme.fontWeights.semibold;
      case 'bold':
        return props.theme.fontWeights.bold;
      default:
        return props.theme.fontWeights.normal;
    }
  }};
`;

export const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: ${props => props.theme.space[1]} ${props => props.theme.space[3]};
  font-size: ${props => props.theme.fontSizes.xs};
  font-weight: ${props => props.theme.fontWeights.medium};
  border-radius: ${props => props.theme.radii.full};
  
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: rgba(99, 102, 241, 0.2);
          color: ${props.theme.colors.primary};
        `;
      case 'success':
        return `/
          background: rgba(16, 185, 129, 0.2);
          color: ${props.theme.colors.success};
        `;
      case 'warning':
        return `
          background: rgba(245, 158, 11, 0.2);
          color: ${props.theme.colors.warning};
        `;
      case 'danger':
        return `
          background: rgba(239, 68, 68, 0.2);
          color: ${props.theme.colors.danger};
        `;
      default:
        return `
          background: ${props.theme.colors.surfaceHover};
          color: ${props.theme.colors.textSecondary};
        `;
    }
  }}
`;
