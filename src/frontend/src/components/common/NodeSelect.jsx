import React from 'react';
import { Select } from '../../styles/components';
import { fmtSpan } from '../../utils/itinerary';

// Plain-text option label with the node's dates, e.g. "Paris (Jun 6 – 8)"
export function nodeLabel(node) {
  const span = fmtSpan(node.arrival_date, node.departure_date);
  return span ? `${node.name} (${span})` : node.name;
}

export function NodeSelect({ nodes, value, onChange, placeholder = 'Select node', ...props }) {
  return (
    <Select value={value} onChange={onChange} {...props}>
      <option value="">{placeholder}</option>
      {nodes.map(n => (
        <option key={n.id} value={n.id}>{nodeLabel(n)}</option>
      ))}
    </Select>
  );
}

export default NodeSelect;
