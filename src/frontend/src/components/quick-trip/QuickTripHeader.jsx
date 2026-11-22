import React, { useId } from 'react';
import { Input, CheckboxLabel, Checkbox } from '../../styles/components';
import { SectionCard, CardHeader, FieldGrid, QInput, Hint } from './quick-trip-styles';
import QuickField from './QuickField';

// Trip name, dates, description and the round-trip toggle.
// trip: raw state; resolved: resolveQuickTrip().trip; errors: shown only when showErrors.
export default function QuickTripHeader({ trip, resolved, errors, showErrors, onChange }) {
  const uid = useId();
  const err = (key) => (showErrors ? errors[key] : undefined);

  return (
    <SectionCard>
      <CardHeader><h3>Trip</h3></CardHeader>

      <QuickField
        id={`${uid}-name`}
        label="Trip name *"
        auto={resolved.auto.name}
        onReset={trip.name && resolved.suggestedName ? () => onChange({ name: '' }) : undefined}
        error={err('trip.name')}
        hint={!resolved.name ? 'Suggested from your stops once you pick them' : undefined}
      >
        <QInput
          id={`${uid}-name`}
          $auto={resolved.auto.name}
          $invalid={Boolean(err('trip.name'))}
          value={resolved.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Europe 2026"
        />
      </QuickField>

      <FieldGrid $cols={2}>
        <QuickField
          id={`${uid}-start`}
          label="Start date *"
          auto={resolved.auto.startDate}
          error={err('trip.startDate')}
        >
          <QInput
            id={`${uid}-start`}
            type="date"
            $auto={resolved.auto.startDate}
            $invalid={Boolean(err('trip.startDate'))}
            value={resolved.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
          />
        </QuickField>
        <QuickField
          id={`${uid}-end`}
          label="End date *"
          auto={resolved.auto.endDate}
          onReset={trip.endDate ? () => onChange({ endDate: '' }) : undefined}
          error={err('trip.endDate')}
          hint={!resolved.endDate ? 'Filled in from the last stop' : undefined}
        >
          <QInput
            id={`${uid}-end`}
            type="date"
            $auto={resolved.auto.endDate}
            $invalid={Boolean(err('trip.endDate'))}
            value={resolved.endDate}
            min={resolved.startDate || undefined}
            onChange={(e) => onChange({ endDate: e.target.value })}
          />
        </QuickField>
      </FieldGrid>

      <QuickField id={`${uid}-description`} label="Description">
        <Input
          id={`${uid}-description`}
          as="textarea"
          rows={2}
          value={trip.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </QuickField>

      <div>
        <CheckboxLabel>
          <Checkbox checked={trip.roundTrip} onChange={(e) => onChange({ roundTrip: e.target.checked })} />
          Return to the starting place
        </CheckboxLabel>
        <div><Hint>Adds a final leg back to the first stop.</Hint></div>
      </div>
    </SectionCard>
  );
}
