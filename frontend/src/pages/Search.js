import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import styled from 'styled-components';
import { globalSearch } from '../api/search';

const Input = styled.input`
  width: 100%;
  padding: ${p => p.theme.space[3]};
  background: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: ${p => p.theme.radii.md};
  color: ${p => p.theme.colors.text};
  font-size: ${p => p.theme.fontSizes.md};
  &:focus { outline: 2px solid ${p => p.theme.colors.primary}; outline-offset: 2px; }
`;

const SectionHeader = styled.h3`
  margin: ${p => p.theme.space[5]} 0 ${p => p.theme.space[2]};
  font-size: ${p => p.theme.fontSizes.lg};
  color: ${p => p.theme.colors.text};
`;

const ResultCard = styled(Link)`
  display: block;
  padding: ${p => p.theme.space[3]} ${p => p.theme.space[4]};
  background: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: ${p => p.theme.radii.md};
  text-decoration: none;
  color: ${p => p.theme.colors.text};
  transition: ${p => p.theme.transitions.fast};
  &:hover { background: ${p => p.theme.colors.surfaceHover}; border-color: ${p => p.theme.colors.primary}; }
  + & { margin-top: ${p => p.theme.space[2]}; }
`;

const Meta = styled.div`
  font-size: ${p => p.theme.fontSizes.xs};
  color: ${p => p.theme.colors.textSecondary};
  margin-top: ${p => p.theme.space[1]};
  display: flex; flex-wrap: wrap; gap: ${p => p.theme.space[2]};
`;

const Badge = styled.span`
  background: ${p => p.theme.colors.surfaceHover};
  border: 1px solid ${p => p.theme.colors.border};
  padding: 2px 6px;
  border-radius: ${p => p.theme.radii.sm};
  font-size: ${p => p.theme.fontSizes.xs};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Empty = styled.div`
  margin-top: ${p => p.theme.space[6]};
  color: ${p => p.theme.colors.textSecondary};
`;

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const qp = params.get('q') || '';
  const [input, setInput] = useState(qp);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  // Debounced query term actually used to fetch
  const [term, setTerm] = useState(qp);
  useEffect(() => { setInput(qp); setTerm(qp); }, [qp]);

  useEffect(() => {
    if (input.trim() === '') { setResults([]); return; }
    const h = setTimeout(() => {
      setParams(p => { p.set('q', input); return p; }, { replace: true });
      setTerm(input);
    }, 300);
    return () => clearTimeout(h);
  }, [input, setParams]);

  useEffect(() => {
    if (!term || term.trim().length < 2) { setResults([]); return; }
    let cancelled = false;
    setLoading(true);
    globalSearch(term).then(data => { if (!cancelled) setResults(data); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [term]);

  const grouped = useMemo(() => {
    const g = {};
    results.forEach(r => { (g[r.type] = g[r.type] || []).push(r); });
    return g;
  }, [results]);

  const order = ['trip','node','leg','stop'];

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Search</h1>
      <Input
        placeholder="Search trips, nodes, legs, stops..."
        value={input}
        onChange={e => setInput(e.target.value)}
        autoFocus
      />
      {loading && <div style={{ marginTop: 12 }}>Searching...</div>}
      {!loading && term && results.length === 0 && <Empty>No results</Empty>}
      {order.map(key => (
        grouped[key] && grouped[key].length > 0 ? (
          <div key={key}>
            <SectionHeader>{key.charAt(0).toUpperCase()+key.slice(1)}s</SectionHeader>
            {grouped[key].map(r => {
              const link = r.type === 'trip' ? `/trip/${r.id}` : r.trip_id ? `/trip/${r.trip_id}` : '/';
              return (
                <ResultCard key={`${r.type}-${r.id}`} to={link}>
                  <strong>{r.title || '(Untitled)'}</strong>
                  {r.subtitle && <div style={{ marginTop: 4, fontSize: '0.875rem', opacity: 0.85 }}>{r.subtitle}</div>}
                  <Meta>
                    <Badge>{r.type}</Badge>
                    {r.date && <span>{new Date(r.date).toISOString().split('T')[0]}</span>}
                    {r.matched_fields && r.matched_fields.slice(0,4).map(f => <Badge key={f}>{f}</Badge>)}
                  </Meta>
                </ResultCard>
              );
            })}
          </div>
        ) : null
      ))}
      <div style={{ marginTop: 40, fontSize: '0.75rem', opacity: 0.6 }}>
        Showing up to 50 results. Refine your query for more specific matches.
      </div>
    </div>
  );
}
