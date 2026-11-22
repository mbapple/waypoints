import React from 'react';
import { Select } from '../../styles/components';

export function LegSelect({ legs, value, onChange, placeholder = 'Select leg', ...props }) {
  return (
    <Select value={value} onChange={onChange} {...props}>
      <option value="">{placeholder}</option>
      {legs.map(l => (
        <option key={l.id} value={l.id}>
          {l.type} from {l.start_node_name} to {l.end_node_name}
        </option>
      ))}
    </Select>
  );
}

export default LegSelect;
