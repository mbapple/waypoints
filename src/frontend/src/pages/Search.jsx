import React, { useEffect, useState, useMemo } from 'react';
import useDocumentTitle from "../utils/useDocumentTitle";
import { useSearchParams, Link } from 'react-router-dom';
import styled from 'styled-components';
import { globalSearch } from '../api/search';
import { PageHeader } from '../components/page-components';

const Input = styled.input`
  width: 100%;
  padding: ${p => p.theme.space[2]} ${p => p.theme.space[3]};
  min-height: 40px;
  background: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: ${p => p.theme.radii.md};
  color: ${p => p.theme.colors.text};
  font-size: ${p => p.theme.fontSizes.base};
  &::placeholder { color: ${p => p.theme.colors.textMuted}; }
  &:focus { outline: none; border-color: ${p => p.theme.colors.primary}; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15); }
`;

const SectionHeader = styled.h3`
  margin: ${p => p.theme.space[4]} 0 ${p => p.theme.space[2]};
  font-size: ${p => p.theme.fontSizes.xs};
  font-weight: ${p => p.theme.fontWeights.semibold};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${p => p.theme.colors.textMuted};
`;

const ResultCard = styled(Link)`
  display: block;
  padding: ${p => p.theme.space[2]} ${p => p.theme.space[3]};
  background: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: ${p => p.theme.radii.lg};
  text-decoration: none;
  color: ${p => p.theme.colors.text};
  transition: ${p => p.theme.transitions.fast};
  &:hover { background: ${p => p.theme.colors.surfaceHover}; border-color: ${p => p.theme.colors.primary}; }
  & + & { margin-top: ${p => p.theme.space[2]}; }
`;

const Subtitle = styled.div`
  margin-top: 2px;
  font-size: ${p => p.theme.fontSizes.sm};
  color: ${p => p.theme.colors.textSecondary};
`;

const Meta = styled.div`
  font-size: ${p => p.theme.fontSizes.xs};
  color: ${p => p.theme.colors.textMuted};
  align-items: center;
  margin-top: ${p => p.theme.space[1]};
  display: flex; flex-wrap: wrap; gap: ${p => p.theme.space[2]};
`;

const Badge = styled.span`
  background: ${p => p.theme.colors.surfaceHover};
  border: 1px solid ${p => p.theme.colors.border};
  padding: 1px 6px;
  border-radius: ${p => p.theme.radii.full};
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const Empty = styled.div`
  margin-top: ${p => p.theme.space[4]};
  color: ${p => p.theme.colors.textSecondary};
`;

const Status = styled.div`
  margin-top: ${p => p.theme.space[3]};
  color: ${p => (p.$error ? p.theme.colors.danger : p.theme.colors.textSecondary)};
`;

const Footnote = styled.div`
  margin-top: ${p => p.theme.space[6]};
  font-size: ${p => p.theme.fontSizes.xs};
  color: ${p => p.theme.colors.textMuted};
`;

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  useDocumentTitle("Search");
  const qp = params.get('q') || '';
  const [input, setInput] = useState(qp);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null); // NEW

  // Debounced query term actually used to fetch
  const [term, setTerm] = useState(qp);
  useEffect(() => { setInput(qp); setTerm(qp); }, [qp]);

  useEffect(() => {
    if (input.trim() === '') {
      setResults([]);
      setError(null);
      // Clear query param cleanly (avoid mutating existing instance)
      setParams({}, { replace: true });
      return;
    }
    const h = setTimeout(() => {
      setParams({ q: input }, { replace: true }); // avoid mutating URLSearchParams
      setTerm(input);
    }, 300);
    return () => clearTimeout(h);
  }, [input, setParams]);

  useEffect(() => {
    if (!term || term.trim().length < 2) { 
      setResults([]); 
      setError(null);
      return; 
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await globalSearch(term);
        if (!cancelled) setResults(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) {
          setResults([]);
            // Axios often throws generic "Network Error"; surface something user-friendly
          setError(e?.message === 'Network Error' ? 'Unable to reach server. Check connection or try again.' : (e?.message || 'Search failed'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [term]);

  const grouped = useMemo(() => {
    const g = {};
    results.forEach(r => { (g[r.type] = g[r.type] || []).push(r); });
    return g;
  }, [results]);

  const order = ['trip','node','leg','stop','adventure'];

  return (
    <div>
      <PageHeader>
        <h1>Search</h1>
      </PageHeader>
      <Input
        placeholder="Search trips, nodes, legs, stops..."
        value={input}
        onChange={e => setInput(e.target.value)}
        autoFocus
      />
      {loading && <Status>Searching...</Status>}
      {!loading && error && <Status $error>{error}</Status>}
      {!loading && !error && term && results.length === 0 && <Empty>No results</Empty>}
      {order.map(key => (
        grouped[key] && grouped[key].length > 0 ? (
          <div key={key}>
            <SectionHeader>{key.charAt(0).toUpperCase()+key.slice(1)}s</SectionHeader>
            {grouped[key].map(r => {
              const link = r.type === 'trip'
                ? `/trip/${r.id}`
                : r.type === 'adventure'
                  ? `/adventures/view?adventureID=${r.id}`
                  : r.trip_id ? `/trip/${r.trip_id}` : '/';
              return (
                <ResultCard key={`${r.type}-${r.id}`} to={link}>
                  <strong>{r.title || '(Untitled)'}</strong>
                  {r.subtitle && <Subtitle>{r.subtitle}</Subtitle>}
                  <Meta>
                    <Badge>{r.type}</Badge>
                    {(r.start_date || r.end_date) && (
                      <span>
                        {r.start_date && r.end_date && r.start_date !== r.end_date
                          ? `${r.start_date} → ${r.end_date}`
                          : (r.start_date || r.end_date)}
                      </span>
                    )}
                    {r.matched_fields && r.matched_fields.slice(0,4).map(f => <Badge key={f}>{f}</Badge>)}
                  </Meta>
                </ResultCard>
              );
            })}
          </div>
        ) : null
      ))}
      <Footnote>
        Showing up to 50 results. Refine your query for more specific matches.
      </Footnote>
    </div>
  );
}
