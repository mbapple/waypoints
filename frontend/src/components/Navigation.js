import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { Container, Flex } from '../styles/components';

const NavContainer = styled.nav`
  background: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  padding: ${props => props.theme.space[4]} 0;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
`;

const NavBrand = styled(Link)`
  font-size: ${props => props.theme.fontSizes.xl};
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${props => props.theme.colors.text};
  text-decoration: none;
  
  &:hover {
    color: ${props => props.theme.colors.primary};
  }
`;

const NavLinks = styled(Flex)`
  gap: ${props => props.theme.space[1]};
`;

const NavLink = styled(Link)`
  padding: ${props => props.theme.space[2]} ${props => props.theme.space[4]};
  color: ${props => props.theme.colors.textSecondary};
  font-weight: ${props => props.theme.fontWeights.medium};
  border-radius: ${props => props.theme.radii.md};
  transition: ${props => props.theme.transitions.fast};
  text-decoration: none;
  
  &:hover {
    color: ${props => props.theme.colors.text};
    background: ${props => props.theme.colors.surfaceHover};
  }
  
  &.active {
    color: ${props => props.theme.colors.primary};
    background: rgba(99, 102, 241, 0.1);
  }
`;

const Navigation = () => {
  const location = useLocation();
  
  return (
    <NavContainer>
      <Container>
        <Flex justify="space-between" align="center">
          <NavBrand to="/">Waypoints</NavBrand>
          <NavLinks>
            <NavLink
              to="/map"
              className={location.pathname === '/map' ? 'active' : ''}
            >
              Map
            </NavLink>
            <NavLink 
              to="/" 
              className={location.pathname === '/' ? 'active' : ''}
            >
              All Trips
            </NavLink>
            <NavLink 
              to="/create" 
              className={location.pathname === '/create' ? 'active' : ''}
            >
              Create Trip
            </NavLink>
            <NavLink 
              to="/settings" 
              className={location.pathname === '/settings' ? 'active' : ''}
            >
              Settings
            </NavLink>
          </NavLinks>
        </Flex>
      </Container>
    </NavContainer>
  );
};

export default Navigation;
