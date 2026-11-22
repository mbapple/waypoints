import React from 'react';
import { Select } from '../../styles/components';
import { getTransportTypeLabel } from '../../utils/format';

// Picks what a photo is attached to. Value is '' (trip only) or 'node:ID' / 'leg:ID' / 'stop:ID'.
export default function PhotoTargetSelect({ nodes = [], legs = [], stops = [], value, onChange, placeholder = 'Select target…', ...props }) {
  const nodeName = (id) => nodes.find(n => n.id === id)?.name || `Node ${id}`;
  return (
    <Select value={value} onChange={e => onChange(e.target.value)} {...props}>
      <option value="">{placeholder}</option>
      {nodes.map(n => (
        <option key={`node:${n.id}`} value={`node:${n.id}`}>Node: {n.name}</option>
      ))}
      {legs.map(l => (
        <option key={`leg:${l.id}`} value={`leg:${l.id}`}>
          Leg: {getTransportTypeLabel(l.type)} {nodeName(l.start_node_id)} → {nodeName(l.end_node_id)}
        </option>
      ))}
      {stops.map(s => (
        <option key={`stop:${s.id}`} value={`stop:${s.id}`}>Stop: {s.name}</option>
      ))}
    </Select>
  );
}

// 'node:3' -> { node_id: 3 }; '' -> {}
export function targetToIds(target) {
  if (!target) return {};
  const [type, id] = target.split(':');
  return { [`${type}_id`]: Number(id) };
}
