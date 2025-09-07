import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Card, Button, Text } from '../../styles/components';

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const PopupCard = styled(Card)`
  max-width: 760px;
  width: calc(100% - 2rem);
  max-height: 80vh;
  overflow: auto;
  box-shadow: ${p => p.theme.shadows['2xl']};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${p => p.theme.space[4]};
`;

const Popup = ({ title, onClose, children }) => {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <Backdrop onClick={onBackdrop}>
      <PopupCard ref={ref}>
        <Header>
          <h2>{title}</h2>
          <Button variant="ghost" onClick={onClose}><Text variant="muted">Close</Text></Button>
        </Header>
        {children}
      </PopupCard>
    </Backdrop>
  );
};

export default Popup;
