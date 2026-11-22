import React, { useId } from 'react';
import { Button, Flex, CheckboxLabel, Checkbox } from '../../styles/components';
import { PlaceSearchInput } from '../map-integration-components';
import { placeToOsmFields } from '../../utils/places';
import { SectionCard, CardHeader, StopIndex, FieldGrid, QInput, Hint } from './quick-trip-styles';
import QuickField from './QuickField';

const placeCleared = { latitude: '', longitude: '', osmID: '', osmCountry: '', osmState: '', shortName: '' };

// One stop in the itinerary. node: raw state; resolved: the resolved node.
// onChange(patch | prev => patch | null). The round-trip return stop (resolved.isReturn)
// mirrors the first stop, so only its arrival date can be edited.
export default function QuickNodeCard({
  node, resolved, index, localPlaces, errors, showErrors,
  onChange, onRemove, onInsertAfter, canRemove,
}) {
  const uid = useId();
  const err = (field) => (showErrors ? errors[`node.${node.uid}.${field}`] : undefined);
  const isReturn = Boolean(resolved.isReturn);
  const { isFirst, isLast } = resolved;
  const title = isReturn ? `Back to ${resolved.name || 'start'}` : isFirst ? 'Start' : isLast ? 'Final stop' : 'Stop';
  const invalid = Boolean(err('place') || err('name') || err('departure'));

  // Typing (rather than picking a result) invalidates the picked place
  const onPlaceText = (e) => {
    const value = e.target.value;
    onChange(prev => (value === prev.osmName ? null : { osmName: value, ...placeCleared }));
  };

  const arrival = (
    <QuickField id={`${uid}-arr`} label="Arrive" auto={resolved.auto.arrival}>
      <QInput
        id={`${uid}-arr`}
        type="date"
        $auto={resolved.auto.arrival}
        value={resolved.arrival}
        onChange={(e) => onChange({ arrivalDate: e.target.value })}
      />
    </QuickField>
  );

  return (
    <SectionCard $invalid={invalid}>
      <CardHeader>
        <h3><StopIndex>{index + 1}</StopIndex>{title}</h3>
        {!isReturn && (
          <Flex gap={2} wrap>
            <Button type="button" size="sm" variant="ghost" onClick={onInsertAfter} title="Insert a stop after this one">+ Stop after</Button>
            {canRemove && (
              <Button type="button" size="sm" variant="outline" onClick={onRemove}>Remove</Button>
            )}
          </Flex>
        )}
      </CardHeader>

      {isReturn ? (
        <FieldGrid $cols={2}>
          {arrival}
          <div />
        </FieldGrid>
      ) : (
        <>
          <QuickField id={`${uid}-place`} label="Place *" error={err('place')}>
            <PlaceSearchInput
              placeholder="Search for a city or town..."
              value={node.osmName || ''}
              localPlaces={localPlaces}
              onChange={onPlaceText}
              onPlaceSelect={(place) => onChange({ ...placeToOsmFields(place) })}
            />
          </QuickField>

          <QuickField
            id={`${uid}-name`}
            label="Display name *"
            auto={resolved.auto.name}
            onReset={node.name && node.shortName ? () => onChange({ name: '' }) : undefined}
            error={err('name')}
          >
            <QInput
              id={`${uid}-name`}
              $auto={resolved.auto.name}
              $invalid={Boolean(err('name'))}
              value={resolved.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. Dallas"
            />
          </QuickField>

          {isFirst ? (
            <FieldGrid $cols={2}>
              <QuickField id={`${uid}-dep`} label="Leave" auto={resolved.auto.departure} hint={!resolved.departure ? 'Defaults to the trip start date' : undefined}>
                <QInput
                  id={`${uid}-dep`}
                  type="date"
                  $auto={resolved.auto.departure}
                  value={resolved.departure}
                  onChange={(e) => onChange({ departureDate: e.target.value })}
                />
              </QuickField>
              <div />
            </FieldGrid>
          ) : isLast ? (
            <FieldGrid $cols={2}>
              {arrival}
              <div />
            </FieldGrid>
          ) : (
            <FieldGrid $cols={3}>
              {arrival}
              <QuickField id={`${uid}-nights`} label="Nights" auto={resolved.auto.nights}>
                <QInput
                  id={`${uid}-nights`}
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  $auto={resolved.auto.nights}
                  value={resolved.nights}
                  onChange={(e) => onChange({ nights: e.target.value, departureDate: '' })}
                />
              </QuickField>
              <QuickField id={`${uid}-dep`} label="Depart" auto={resolved.auto.departure} error={err('departure')}>
                <QInput
                  id={`${uid}-dep`}
                  type="date"
                  $auto={resolved.auto.departure}
                  $invalid={Boolean(err('departure'))}
                  value={resolved.departure}
                  min={resolved.arrival || undefined}
                  onChange={(e) => onChange({ departureDate: e.target.value, nights: '' })}
                />
              </QuickField>
            </FieldGrid>
          )}

          {!isFirst && !isLast && (
            <div>
              <CheckboxLabel>
                <Checkbox checked={Boolean(node.invisible)} onChange={(e) => onChange({ invisible: e.target.checked })} />
                Layover (hidden from destinations)
              </CheckboxLabel>
              <div><Hint>For connections you only passed through, such as a change of planes.</Hint></div>
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}
