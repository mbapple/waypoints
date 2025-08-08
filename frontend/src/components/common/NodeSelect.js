import React from 'react';
import { Select } from '../../styles/components';

export function NodeSelect({ nodes, value, onChange, placeholder = 'Select node', ...props }) {
  return (
    <Select value={value} onChange={onChange} {...props}>
      <option value="">{placeholder}</option>
      {nodes.map(n => (
        <option key={n.id} value={n.id}>{n.name}</option>
      ))}
    </Select>
  );
}

export default NodeSelect;
