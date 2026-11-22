import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import Popup from '../common/Popup';
import PhotoTargetSelect, { targetToIds } from './PhotoTargetSelect';
import { Button, Text, Flex, LoadingSpinner } from '../../styles/components';
import { listTripImmichAssets, listAdventureImmichAssets, linkImmichAsset } from '../../api/immich';
import { suggestPhotoTarget } from '../../utils/photoMatch';

const DayHeading = styled.h4`
  margin: ${p => p.theme.space[4]} 0 ${p => p.theme.space[2]};
  font-size: ${p => p.theme.fontSizes.base};
  color: ${p => p.theme.colors.textSecondary};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: ${p => p.theme.space[2]};

  @media (max-width: ${p => p.theme.breakpoints.sm}) {
    grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  }
`;

const Tile = styled.button`
  position: relative;
  aspect-ratio: 1;
  padding: 0;
  border-radius: ${p => p.theme.radii.md};
  overflow: hidden;
  background: ${p => p.theme.colors.backgroundTertiary};
  border: 3px solid ${p => (p.$selected ? p.theme.colors.primary : 'transparent')};
  cursor: ${p => (p.disabled ? 'default' : 'pointer')};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    opacity: ${p => (p.$linked ? 0.4 : 1)};
  }

  &:hover:not(:disabled) img {
    filter: brightness(1.1);
  }
`;

const LinkedBadge = styled.span`
  position: absolute;
  bottom: 4px;
  left: 4px;
  padding: 1px 6px;
  border-radius: ${p => p.theme.radii.full};
  background: ${p => p.theme.colors.success};
  color: white;
  font-size: ${p => p.theme.fontSizes.xs};
`;

// Stays visible at the top of the scrolling popup while the grid scrolls beneath it
const Prompt = styled.div`
  position: sticky;
  top: 0;
  z-index: 1;
  margin: 0 calc(-1 * ${p => p.theme.space[6]}) ${p => p.theme.space[4]};
  padding: ${p => p.theme.space[4]} ${p => p.theme.space[6]};
  background: ${p => p.theme.colors.backgroundSecondary};
  border-top: 1px solid ${p => p.theme.colors.border};
  border-bottom: 1px solid ${p => p.theme.colors.border};
  display: flex;
  gap: ${p => p.theme.space[4]};
  align-items: flex-start;

  @media (max-width: ${p => p.theme.breakpoints.sm}) {
    flex-direction: column;
  }
`;

const PromptImage = styled.img`
  width: 160px;
  height: 160px;
  object-fit: cover;
  border-radius: ${p => p.theme.radii.md};
  flex-shrink: 0;
  background: ${p => p.theme.colors.backgroundTertiary};

  @media (max-width: ${p => p.theme.breakpoints.sm}) {
    width: 100%;
    height: 200px;
  }
`;

const formatTime = (takenAt) => {
  if (!takenAt) return 'Unknown time';
  const [d, t] = takenAt.split('T');
  return `${d}${t ? ` ${t.slice(0, 5)}` : ''}`;
};

const placeOf = (a) => [a.city, a.state, a.country].filter(Boolean).join(', ');

const errorMessage = (e, fallback) => e?.response?.data?.detail || fallback;

// Pass tripId (with its nodes/legs/stops, so each photo can be attached to one of them)
// or adventureId (photos link to the adventure itself).
export default function ImmichPickerPopup({ tripId, adventureId, nodes = [], legs = [], stops = [], onClose, onLinked }) {
  const isTrip = tripId != null && tripId !== '';
  const ownerLabel = isTrip ? 'trip' : 'adventure';

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [truncated, setTruncated] = useState(false);
  const [selected, setSelected] = useState(null); // asset
  const [suggestion, setSuggestion] = useState({ target: '', reason: '' });
  const [target, setTarget] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (isTrip ? listTripImmichAssets(tripId) : listAdventureImmichAssets(adventureId))
      .then(data => {
        if (cancelled) return;
        setAssets(data.assets || []);
        setTruncated(!!data.truncated);
      })
      .catch(e => !cancelled && setLoadError(errorMessage(e, 'Could not load photos from Immich')))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [isTrip, tripId, adventureId]);

  const byDay = useMemo(() => {
    const groups = [];
    for (const a of assets) {
      const last = groups[groups.length - 1];
      if (last && last.date === a.date) last.items.push(a);
      else groups.push({ date: a.date, items: [a] });
    }
    return groups;
  }, [assets]);

  const select = (asset) => {
    const s = isTrip ? suggestPhotoTarget(asset, { nodes, legs, stops }) : { target: '', reason: '' };
    setSelected(asset);
    setSuggestion(s);
    setTarget(s.target);
    setLinkError('');
  };

  const link = async () => {
    if (!selected) return;
    setLinking(true);
    setLinkError('');
    try {
      await linkImmichAsset(isTrip
        ? { asset_id: selected.id, trip_id: Number(tripId), ...targetToIds(target) }
        : { asset_id: selected.id, adventure_id: Number(adventureId) });
      setAssets(prev => prev.map(a => (a.id === selected.id ? { ...a, linked: true } : a)));
      setSelected(null);
      onLinked && onLinked(target);
    } catch (e) {
      setLinkError(errorMessage(e, 'Linking failed'));
    } finally {
      setLinking(false);
    }
  };

  const linkedCount = assets.filter(a => a.linked).length;

  return (
    <Popup title="Link photos from Immich" onClose={onClose}>
      {selected && (
        <Prompt>
          <PromptImage src={selected.preview_url} alt={selected.filename || 'Selected photo'} />
          <Flex direction="column" gap={2} style={{ flex: 1, minWidth: 0, width: '100%' }}>
            <Text weight="semibold">{formatTime(selected.taken_at)}</Text>
            <Text variant="muted" size="sm">
              {placeOf(selected) || (selected.latitude != null ? `${selected.latitude.toFixed(4)}, ${selected.longitude.toFixed(4)}` : 'No location')}
            </Text>
            {isTrip ? (
              <>
                <label htmlFor="immich-link-target"><Text size="sm">Link this photo to:</Text></label>
                <PhotoTargetSelect
                  id="immich-link-target"
                  nodes={nodes}
                  legs={legs}
                  stops={stops}
                  value={target}
                  onChange={setTarget}
                  placeholder="Trip only (no specific item)"
                />
              </>
            ) : (
              <Text size="sm">Link this photo to the adventure?</Text>
            )}
            {isTrip && suggestion.reason && (
              <Text variant="muted" size="xs">
                {target === suggestion.target ? 'Suggested: ' : 'Suggestion was: '}{suggestion.reason}
              </Text>
            )}
            {linkError && <Text variant="danger" size="sm">{linkError}</Text>}
            <Flex gap={2} wrap>
              <Button variant="primary" size="sm" onClick={link} disabled={linking}>
                {linking ? 'Linking…' : 'Link photo'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelected(null)} disabled={linking}>
                Cancel
              </Button>
            </Flex>
          </Flex>
        </Prompt>
      )}

      {loading && (
        <Flex align="center" gap={3}>
          <LoadingSpinner />
          <Text variant="muted">Loading photos from Immich…</Text>
        </Flex>
      )}
      {loadError && <Text variant="danger">{loadError}</Text>}
      {!loading && !loadError && assets.length === 0 && (
        <Text variant="muted">No Immich photos were taken during this {ownerLabel}'s dates.</Text>
      )}
      {!loading && !loadError && assets.length > 0 && (
        <Text variant="muted" size="sm">
          {assets.length} photo{assets.length === 1 ? '' : 's'} from this {ownerLabel}'s dates
          {linkedCount ? `, ${linkedCount} already linked` : ''}. Select one to link it.
          {truncated && ` Only the first photos are shown; the ${ownerLabel} has too many to list.`}
        </Text>
      )}

      {byDay.map(group => (
        <div key={group.date}>
          <DayHeading>{group.date}</DayHeading>
          <Grid>
            {group.items.map(a => (
              <Tile
                key={a.id}
                type="button"
                onClick={() => select(a)}
                disabled={a.linked}
                $linked={a.linked}
                $selected={selected?.id === a.id}
                title={`${formatTime(a.taken_at)}${placeOf(a) ? ` · ${placeOf(a)}` : ''}${a.linked ? ' (linked)' : ''}`}
              >
                <img src={a.thumbnail_url} alt={a.filename || 'Immich photo'} loading="lazy" />
                {a.linked && <LinkedBadge>Linked</LinkedBadge>}
              </Tile>
            ))}
          </Grid>
        </div>
      ))}
    </Popup>
  );
}
