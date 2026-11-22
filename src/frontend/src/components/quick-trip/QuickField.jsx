import React from 'react';
import { FormGroup, Label } from '../../styles/components';
import { LabelRow, AutoTag, LinkButton, FieldError, Hint } from './quick-trip-styles';

// Label with an "auto" tag when the value was derived, or a "Reset" link when the
// user overrode a value that can be derived again; plus an optional hint and error.
export default function QuickField({ id, label, auto, autoLabel = 'auto', onReset, error, hint, children, style }) {
  return (
    <FormGroup style={style}>
      <LabelRow>
        <Label htmlFor={id}>{label}</Label>
        {auto && <AutoTag title="Filled in automatically. Type to override.">{autoLabel}</AutoTag>}
        {!auto && onReset && (
          <LinkButton type="button" onClick={onReset} title="Go back to the automatic value">Reset</LinkButton>
        )}
      </LabelRow>
      {children}
      {error ? <FieldError role="alert">{error}</FieldError> : hint ? <Hint>{hint}</Hint> : null}
    </FormGroup>
  );
}
