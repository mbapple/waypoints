import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/page-components';
import { FormCard } from '../../components/input-components';
import { Button, Flex, Text, Badge } from '../../styles/components';
import ListForm from '../../components/forms/ListForm';
import { getList, updateList, deleteList, addOverride, removeOverride } from '../../api/lists';

export default function UpdateList() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listData, setListData] = useState(null);
  const [error, setError] = useState(null);
  const [overrideInput, setOverrideInput] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const data = await getList(id);
        if (!cancelled) setListData(data);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load list');
      } finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [id, refreshKey]);

  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      await updateList(id, { name: data.name, match_type: data.match_type, items: data.items });
      refresh();
    } catch (e) { console.error(e); alert('Failed to update list'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this list?')) return;
  try { await deleteList(id); navigate('/statistics'); } catch (e) { console.error(e); alert('Delete failed'); }
  };

  const handleAddOverride = async () => {
    const val = overrideInput.trim(); if (!val) return;
    try { await addOverride(id, val); setOverrideInput(''); refresh(); } catch (e) { console.error(e); alert('Failed to add override'); }
  };
  const handleRemoveOverride = async (item) => {
    try { await removeOverride(id, item); refresh(); } catch (e) { console.error(e); alert('Failed to remove override'); }
  };

  if (loading) return <div style={{ padding: 20 }}>Loading list...</div>;
  if (error) return <div style={{ padding: 20, color: '#f66' }}>Error: {error}</div>;
  if (!listData) return null;

  const { list, summary } = listData;
  const initialValues = { name: list.name, match_type: list.match_type, items: (list.items || []).join(', ') };

  return (
    <div>
      <PageHeader>
        <Flex justify="space-between" align="flex-start" wrap>
          <div>
            <h1>Edit List</h1>
            <Text variant="secondary" size="lg">Update list details & items</Text>
          </div>
          <Flex gap={8}>
            <Button variant="outline" onClick={() => navigate('/statistics')}>← Back</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </Flex>
        </Flex>
      </PageHeader>
      <FormCard>
  <ListForm initialValues={initialValues} onSubmit={handleSubmit} onCancel={() => navigate('/statistics')} submitLabel={saving ? 'Saving...' : 'Save Changes'} saving={saving} />
      </FormCard>

      <div style={{ marginTop: 32 }}>
        <h2>Manual Overrides</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input style={{ flex: 1 }} placeholder="Add override" value={overrideInput} onChange={e => setOverrideInput(e.target.value)} />
          <Button onClick={handleAddOverride}>Add</Button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(list.manual_overrides || []).map(o => (
            <Badge key={o} variant="info" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {o}
              <button onClick={() => handleRemoveOverride(o)} style={{ marginLeft: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 14 }}>×</button>
            </Badge>
          ))}
          {(!list.manual_overrides || list.manual_overrides.length === 0) && <Text variant="secondary">No overrides yet.</Text>}
        </div>
      </div>

      <div style={{ marginTop: 40 }}>
        <h2>Match Summary</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #333' }}>Item</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #333' }}>Auto Count</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #333' }}>Matched?</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #333' }}>Override?</th>
            </tr>
          </thead>
          <tbody>
            {summary.map(row => (
              <tr key={row.item}>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #222' }}>{row.item}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #222' }}>{row.auto_match_count}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #222' }}>{row.matched ? 'Yes' : 'No'}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #222' }}>{row.override ? 'Yes' : 'No'}</td>
              </tr>
            ))}
            {summary.length === 0 && <tr><td colSpan={4} style={{ padding: '8px', textAlign: 'center' }}>No items.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
