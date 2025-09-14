import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { Card, Button, Flex, Text, Badge, Input } from '../../styles/components';
import Popup from '../common/Popup';
import { listLists, getList, addOverride, removeOverride } from '../../api/lists';
import { useNavigate } from 'react-router-dom';

const Wrapper = styled(Card)`
  margin-top: 2rem;
  position: relative;
  padding-top: 2.25rem; /* space for top arrows */
`;

const HeaderRow = styled(Flex)`
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
`;

const ProgressTrack = styled.div`
  width: 100%;
  height: 10px;
  background: ${p => p.theme.colors.surfaceHover};
  border-radius: ${p => p.theme.radii.full};
  overflow: hidden;
  margin: 0.75rem 0 1rem;
  border: 1px solid ${p => p.theme.colors.border};
`;

const ProgressFill = styled.div`
  height: 100%;
  background: ${p => p.theme.colors.primary};
  width: ${p => p.$pct}%;
  transition: width 0.3s ease;
`;

const ItemsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.5rem;
`;

const ItemCard = styled.button`
  text-align: left;
  padding: 0.5rem 0.6rem 0.6rem;
  background: ${p => p.$matched ? p.theme.colors.surfaceHover : p.theme.colors.backgroundSecondary};
  border: 1px solid ${p => p.$matched ? p.theme.colors.primary : p.theme.colors.border};
  border-radius: ${p => p.theme.radii.md};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
  font: inherit;
  color: ${p => p.theme.colors.text};
  transition: background 0.15s, border-color 0.15s;
  &:hover { background: ${p => p.theme.colors.surfaceHover}; }
`;

// Removed checkbox indicator (highlight sufficient)

const NavArrow = styled(Button)`
  position: absolute;
  top: 0.25rem;
  padding: 0.25rem 0.5rem;
  z-index: 2;
`;
const LeftArrow = styled(NavArrow)` left: 0.25rem; `;
const RightArrow = styled(NavArrow)` right: 0.25rem; `;

const OverridesPanel = styled.div`
  display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; margin-top: 0.75rem;
`;

// Popup styling elements reusing Statistics style semantics
const RowHeader = styled.div`
  padding: 0.5rem 0;
  border-bottom: 1px solid ${p => p.theme.colors.border};
  margin-top: 0.75rem;
  &:first-child { margin-top: 0; }
`;
const SubRow = styled(Flex)`
  padding: 0.45rem 0;
  border-bottom: 1px solid ${p => p.theme.colors.border};
`;
const Empty = styled(Text)`
  display: block; padding: 0.5rem 0; font-size: 0.85rem; opacity: .8;
`;

export default function ListSlideshow() {
  const [lists, setLists] = useState([]);
  const [index, setIndex] = useState(0);
  const [detail, setDetail] = useState(null); // detail of current list
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [popup, setPopup] = useState({ open: false, title: '', content: null });
  const [newOverride, setNewOverride] = useState('');
  const navigate = useNavigate();

  const current = lists[index];

  // initial load of lists minimal
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { const data = await listLists(); if (!cancelled) setLists(data); }
      catch (e) { console.error('Failed to load lists', e); }
    })();
    return () => { cancelled = true; };
  }, []);

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    setLoadingDetail(true); setDetail(null);
    try { const data = await getList(id); setDetail(data); }
    catch (e) { console.error(e); }
    finally { setLoadingDetail(false); }
  }, []);

  useEffect(() => { if (current?.id) loadDetail(current.id); }, [current, loadDetail]);

  const goPrev = () => setIndex(i => Math.max(0, i - 1));
  const goNext = () => setIndex(i => Math.min(lists.length - 1, i + 1));

  const progressPct = (() => {
    if (!detail) return 0;
    const total = detail.summary.length;
    if (!total) return 0;
    const done = detail.summary.filter(s => s.matched).length;
    return Math.round((done / total) * 100);
  })();

  const openItemPopup = (itemEntry) => {
    if (!detail) return;
    const entities = detail.entities[itemEntry.item] || { nodes: [], stops: [], adventures: [] };
    const content = (
      <div>
        <RowHeader style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <Text weight="semibold">{itemEntry.item}</Text>
        </RowHeader>
        {/* Nodes */}
        <RowHeader><Text weight="semibold" size="sm">Nodes</Text></RowHeader>
        {(entities.nodes || []).length === 0 && <Empty variant="muted">No nodes.</Empty>}
        {(entities.nodes || []).map(n => (
          <SubRow key={`node-${n.id}`} direction="column" style={{ alignItems: 'flex-start' }}>
            <Text size="sm" weight="semibold">{n.name || n.osm_name || `Node #${n.id}`}</Text>
            {n.trip_id && <Text size="xs"><a href={`/trip/${n.trip_id}`}>{n.trip_name || 'Trip'}</a></Text>}
            {n.start_date && <Text size="xs" variant="muted">{n.start_date}{n.end_date && n.end_date !== n.start_date ? ` → ${n.end_date}` : ''}</Text>}
          </SubRow>
        ))}
        {/* Stops */}
        <RowHeader><Text weight="semibold" size="sm">Stops</Text></RowHeader>
        {(entities.stops || []).length === 0 && <Empty variant="muted">No stops.</Empty>}
        {(entities.stops || []).map(s => (
          <SubRow key={`stop-${s.id}`} direction="column" style={{ alignItems: 'flex-start' }}>
            <Text size="sm" weight="semibold">{s.name || s.osm_name || `Stop #${s.id}`}</Text>
            {s.trip_id && <Text size="xs"><a href={`/trip/${s.trip_id}`}>{s.trip_name || 'Trip'}</a></Text>}
            {s.start_date && <Text size="xs" variant="muted">{s.start_date}{s.end_date && s.end_date !== s.start_date ? ` → ${s.end_date}` : ''}</Text>}
          </SubRow>
        ))}
        {/* Adventures */}
        <RowHeader><Text weight="semibold" size="sm">Adventures</Text></RowHeader>
        {(entities.adventures || []).length === 0 && <Empty variant="muted">No adventures.</Empty>}
        {(entities.adventures || []).map(a => (
          <SubRow key={`adv-${a.id}`} direction="column" style={{ alignItems: 'flex-start' }}>
            <Text size="sm" weight="semibold">{a.name || a.osm_name || `Adventure #${a.id}`}</Text>
            {a.start_date && <Text size="xs" variant="muted">{a.start_date}{a.end_date && a.end_date !== a.start_date ? ` → ${a.end_date}` : ''}</Text>}
          </SubRow>
        ))}
      </div>
    );
  setPopup({ open: true, title: `Visits for ${itemEntry.item}`, content });
  };

  const handleAddOverride = async () => {
    const value = newOverride.trim(); if (!value || !current) return;
    try { await addOverride(current.id, value); setNewOverride(''); await loadDetail(current.id); }
    catch (e) { console.error('Override add failed', e); }
  };
  const handleRemoveOverride = async (item) => {
    if (!current) return;
    try { await removeOverride(current.id, item); await loadDetail(current.id); }
    catch (e) { console.error('Override remove failed', e); }
  };

  if (!lists.length) return null;

  return (
    <Wrapper>
      {index > 0 && <LeftArrow variant="outline" size="sm" onClick={goPrev}>◀</LeftArrow>}
      {index < lists.length - 1 && <RightArrow variant="outline" size="sm" onClick={goNext}>▶</RightArrow>}
      <HeaderRow>
        <div>
          <h3 style={{ margin: 0 }}>{current.name}</h3>
        </div>
        <Flex gap={8} wrap>
          <Button size="sm" variant="secondary" onClick={() => navigate(`/lists/${current.id}/update`)}>Edit</Button>
        </Flex>
      </HeaderRow>
      <ProgressTrack>
        <ProgressFill $pct={progressPct} />
      </ProgressTrack>
      <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
        <Text size="sm" variant="muted">Progress: {progressPct}%{detail ? ` (${detail.summary.filter(s=>s.matched).length}/${detail.summary.length})` : ''}</Text>
        <Text size="sm" variant="muted">List {index + 1} / {lists.length}</Text>
      </Flex>
      {loadingDetail && <Text variant="muted" size="sm">Loading list details…</Text>}
      {detail && (
        <>
          <ItemsGrid>
            {detail.summary.map(item => (
              <ItemCard key={item.item} $matched={item.matched} onClick={() => openItemPopup(item)}>
                <Text size="sm" weight={item.matched ? 'semibold' : undefined}>{item.item}</Text>
                {item.override && <Text size="xs" variant="muted">override</Text>}
              </ItemCard>
            ))}
            {detail.summary.length === 0 && <Text variant="muted" size="sm">No items on this list.</Text>}
          </ItemsGrid>
          <OverridesPanel>
            <Text size="sm" variant="muted">Overrides:</Text>
            {(detail.list.manual_overrides || []).map(o => (
              <Badge key={o} variant="info" style={{ cursor: 'pointer' }} onClick={() => handleRemoveOverride(o)} title="Remove override">{o} ×</Badge>
            ))}
            <Flex align="center" gap={4}>
              <Input placeholder="Add override" value={newOverride} onChange={e => setNewOverride(e.target.value)} style={{ padding: '4px 6px', fontSize: 12 }} />
              <Button size="sm" onClick={handleAddOverride}>Add</Button>
            </Flex>
          </OverridesPanel>
        </>
      )}
      {popup.open && (
        <Popup title={popup.title} onClose={() => setPopup({ open: false, title: '', content: null })}>
          {popup.content}
        </Popup>
      )}
    </Wrapper>
  );
}
