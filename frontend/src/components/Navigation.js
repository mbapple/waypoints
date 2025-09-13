import React, { useState, useEffect } from 'react';
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

  @media (max-width: ${props => props.theme.breakpoints.md}) {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    flex-direction: column;
    background: ${props => props.theme.colors.surface};
    padding: ${props => props.theme.space[4]} ${props => props.theme.space[4]};
    border-bottom: 1px solid ${props => props.theme.colors.border};
    gap: ${props => props.theme.space[2]};
    display: ${props => (props.$open ? 'flex' : 'none')};
    animation: fadeSlide 0.2s ease;
    z-index: 99; /* under nav bar container which is 100 */
  }

  @keyframes fadeSlide {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const HamburgerButton = styled.button`
  display: none;
  background: transparent;
  border: 1px solid transparent;
  padding: ${props => props.theme.space[2]};
  border-radius: ${props => props.theme.radii.md};
  color: ${props => props.theme.colors.text};
  line-height: 0;
  cursor: pointer;

  &:hover { background: ${props => props.theme.colors.surfaceHover}; }
  &:focus-visible { outline: 2px solid ${props => props.theme.colors.primary}; outline-offset: 2px; }

  @media (max-width: ${props => props.theme.breakpoints.md}) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
`;

const HamburgerIcon = ({ open }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {open ? (
      <>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </>
    ) : (
      <>
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </>
    )}
  </svg>
);

const MobileOverlay = styled.div`
  display: none;
  @media (max-width: ${props => props.theme.breakpoints.md}) {
    display: ${props => (props.$open ? 'block' : 'none')};
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    z-index: 50;
  }
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
  const [open, setOpen] = useState(false);

  // Close menu on route change
  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <NavContainer>
      <MobileOverlay $open={open} onClick={() => setOpen(false)} />
      <Container>
        <Flex justify="space-between" align="center" style={{ position: 'relative' }}>
          <NavBrand to="/">Waypoints</NavBrand>
          <HamburgerButton
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={open}
            onClick={() => setOpen(o => !o)}
          >
            <HamburgerIcon open={open} />
          </HamburgerButton>
          <NavLinks $open={open}>
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
              to="/statistics"
              className={location.pathname === '/statistics' ? 'active' : ''}
            >
              Statistics
            </NavLink>
            <NavLink
              to="/create"
              className={location.pathname === '/create' ? 'active' : ''}
            >
              Create Trip
            </NavLink>
            <NavLink
              to="/calendar"
              className={location.pathname === '/calendar' ? 'active' : ''}
            >
              Calendar
            </NavLink>
            <NavLink
              to="/settings"
              className={location.pathname === '/settings' ? 'active' : ''}
            >
              Settings
            </NavLink>
            <NavLink
              to="/search"
              className={location.pathname === '/search' ? 'active' : ''}
            >
              Search
            </NavLink>
          </NavLinks>
        </Flex>
      </Container>
    </NavContainer>
  );
};

export default Navigation;
