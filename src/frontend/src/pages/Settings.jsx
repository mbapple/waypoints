import React, { useEffect, useState } from 'react';
import { Card, Form, FormGroup, Label, Input, Select, Button, Text } from '../styles/components';
import { PageHeader } from '../components/page-components';
import { useSettings } from '../context/SettingsContext';
import { getIntegrationStatus } from '../api/integrations';
import useDocumentTitle from "../utils/useDocumentTitle";
import styled from 'styled-components';

const Sections = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${p => p.theme.space[4]};
    margin-bottom: ${p => p.theme.space[6]};

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        gap: ${p => p.theme.space[3]};
    }
`;

const Section = styled(Card)`
    margin-bottom: 0;

    &:hover {
        border-color: ${p => p.theme.colors.border};
        box-shadow: ${p => p.theme.shadows.sm};
    }

    h2 {
        font-size: ${p => p.theme.fontSizes.lg};
        margin-bottom: ${p => p.theme.space[3]};
    }

    /* Settings forms read top-down from the card's left edge */
    form {
        margin: 0;
    }
`;

const Hint = styled(Text).attrs({ variant: 'muted' })`
    font-size: ${p => p.theme.fontSizes.sm};
`;

const CategoryRow = styled.li`
    display: flex;
    align-items: center;
    gap: ${p => p.theme.space[2]};
    padding: 6px 0;
    margin: 0;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    flex-wrap: wrap;
`;

const EmojiInput = styled.input`
    width: 4.2em;
    text-align: center;
    padding: 2px 6px;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    color: ${p => p.theme.colors.text};
    font-size: 1.05rem;
    min-height: 30px;

    &:focus {
        border-color: ${p => p.theme.colors.primary};
    }
`;

const BackupTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: ${p => p.theme.fontSizes.sm};

    th, td {
        padding: 4px 6px;
        border-bottom: 1px solid ${p => p.theme.colors.border};
        text-align: left;
    }
`;

const Settings = () => {
  useDocumentTitle("Settings");
    const { settings, setTheme, setFontScale } = useSettings();
    // Stop categories state
    const [categories, setCategories] = useState([]);
    const [newCategory, setNewCategory] = useState('');
    const [catLoading, setCatLoading] = useState(false);
    const [catError, setCatError] = useState(null);
    const [emojiEdits, setEmojiEdits] = useState({}); // id -> draft emoji
    const [emojiSaving, setEmojiSaving] = useState({}); // id -> saving state
    const [themeLocal, setThemeLocal] = useState(settings.theme || 'dark');
    const [orsConfigured, setOrsConfigured] = useState(null); // null = loading/unknown
    const [fontScaleLocal, setFontScaleLocal] = useState(settings.fontScale || 1);
    const [saved, setSaved] = useState(false);
    // Backups state (no auth)
    const [backups, setBackups] = useState([]);
    const [backupLoading, setBackupLoading] = useState(false);
    const [backupError, setBackupError] = useState(null);
    const [creatingBackup, setCreatingBackup] = useState(false);
    const [restoreUploading, setRestoreUploading] = useState(false);
    const [restoreLog, setRestoreLog] = useState('');
    const [selectedRestore, setSelectedRestore] = useState('');

    useEffect(() => {
        setThemeLocal(settings.theme || 'dark');
        setFontScaleLocal(settings.fontScale || 1);
    }, [settings.theme, settings.fontScale]);

    useEffect(() => {
        getIntegrationStatus()
            .then((s) => setOrsConfigured(Boolean(s?.ors_configured)))
            .catch(() => setOrsConfigured(false));
    }, []);

    useEffect(() => {
        // lazy load categories when page mounts
        fetchCategories();
    }, []);

    useEffect(() => { fetchBackups(); }, []); // initial load of backups

    const fetchCategories = async () => {
        setCatLoading(true); setCatError(null);
        try {
            const mod = await import('../api/stop_categories');
            const data = await mod.getStopCategories();
            setCategories(data);
        } catch (e) {
            setCatError(e.message || 'Failed to load categories');
        } finally {
            setCatLoading(false);
        }
    };

    const addCategory = async (e) => {
        e.preventDefault();
        if (!newCategory.trim()) return;
        setCatLoading(true); setCatError(null);
        try {
            const mod = await import('../api/stop_categories');
            await mod.createStopCategory({ name: newCategory.trim() });
            setNewCategory('');
            await fetchCategories();
        } catch (e) {
            setCatError(e.response?.data?.detail || e.message || 'Failed to add category');
        } finally {
            setCatLoading(false);
        }
    };

    const deleteCategory = async (cat) => {
        if (!window.confirm(`Delete category "${cat.name}"? All stops with it will become 'other'.`)) return;
        setCatLoading(true); setCatError(null);
        try {
            const mod = await import('../api/stop_categories');
            await mod.deleteStopCategory(cat.id); // backend accepts id or name
            await fetchCategories();
        } catch (e) {
            setCatError(e.response?.data?.detail || e.message || 'Failed to delete category');
        } finally {
            setCatLoading(false);
        }
    };

    const onSave = (e) => {
        e.preventDefault();
        setTheme(themeLocal);
        setFontScale(fontScaleLocal);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
    };

    // ---------- Backups logic ----------
    const fetchBackups = async () => {
        setBackupError(null); setRestoreLog('');
        setBackupLoading(true);
        try {
            const mod = await import('../api/admin');
            const data = await mod.listBackups();
            setBackups(data);
        } catch (e) {
            setBackupError(e.response?.data?.detail || e.message || 'Failed to load backups');
        } finally { setBackupLoading(false); }
    };

    const onCreateBackup = async () => {
        setCreatingBackup(true); setBackupError(null); setRestoreLog('');
        try {
            const mod = await import('../api/admin');
            await mod.createBackup();
            await fetchBackups();
        } catch (e) {
            setBackupError(e.response?.data?.detail || e.message || 'Failed to create backup');
        } finally { setCreatingBackup(false); }
    };

    const onDownload = async (b) => {
        try {
            const mod = await import('../api/admin');
            const { blob, filename } = await mod.downloadBackup(b.filename);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        } catch (e) {
            setBackupError(e.response?.data?.detail || e.message || 'Failed to download');
        }
    };

    const onRestoreFilename = async () => {
        if (!selectedRestore) return;
        if (!window.confirm(`Restore database from ${selectedRestore}? This will overwrite current data.`)) return;
        setRestoreUploading(true); setBackupError(null); setRestoreLog('');
        try {
            const mod = await import('../api/admin');
            const res = await mod.restoreBackupFromFilename(selectedRestore);
            setRestoreLog(res.log || 'Restore complete');
        } catch (e) {
            setBackupError(e.response?.data?.detail || e.message || 'Restore failed');
        } finally { setRestoreUploading(false); }
    };

    const onRestoreFile = async (evt) => {
        const file = evt.target.files?.[0];
        if (!file) return;
        if (!(/\.(dump|sql)$/i).test(file.name)) { setBackupError('File must end with .dump or .sql'); return; }
        if (!window.confirm(`Upload and restore ${file.name}? This will overwrite current data.`)) { return; }
        setRestoreUploading(true); setBackupError(null); setRestoreLog('');
        try {
            const mod = await import('../api/admin');
            const res = await mod.restoreBackupFromFile(file);
            setRestoreLog(res.log || 'Restore complete');
            await fetchBackups();
        } catch (e) {
            setBackupError(e.response?.data?.detail || e.message || 'Restore failed');
        } finally { setRestoreUploading(false); evt.target.value=''; }
    };

    return (
        <div>
            <PageHeader>
                <h1>Settings</h1>
            </PageHeader>
            <Sections>
            <Section>
                <h2>Display</h2>
                <Form onSubmit={onSave}>
                    <FormGroup>
                        <Label htmlFor="theme">Theme</Label>
                        <Select id="theme" value={themeLocal} onChange={(e) => setThemeLocal(e.target.value)}>
                            <option value="dark">Dark</option>
                            <option value="light">Light</option>
                        </Select>
                        <Hint>Switches the visual theme across the app instantly.</Hint>
                    </FormGroup>

                    <FormGroup>
                        <Label>OpenRouteService</Label>
                        <Text variant={orsConfigured ? 'success' : 'muted'}>
                            {orsConfigured === null
                                ? 'Checking…'
                                : orsConfigured
                                    ? 'Configured'
                                    : 'Not configured: set ORS_API_KEY in .env and restart the backend'}
                        </Text>
                        <Hint>Used to auto-fill driving legs with distance, time, and route polyline.</Hint>
                    </FormGroup>

                    <FormGroup>
                        <Label htmlFor="fontScale">Font size</Label>
                        <input
                            id="fontScale"
                            type="range"
                            min="0.5"
                            max="3.0"
                            step="0.05"
                            value={fontScaleLocal}
                            onChange={(e) => setFontScaleLocal(Number(e.target.value))}
                        />
                        <Hint>Current scale: {fontScaleLocal.toFixed(2)}×</Hint>
                    </FormGroup>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Button type="submit" variant="primary">Save</Button>
                        {saved && <Text variant="success" size="sm">Saved</Text>}
                    </div>
                </Form>
            </Section>
            <Section>
                <h2>Stop Categories</h2>
                {catError && <Text variant="danger" style={{ marginBottom: '8px' }}>{catError}</Text>}
                {catLoading && <Text variant="muted">Loading...</Text>}
                {!catLoading && (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {categories.map(c => (
                            <CategoryRow key={c.id}>
                                <span style={{ fontWeight: 500 }}>{c.name}</span>
                                <EmojiInput
                                    type="text"
                                    aria-label={`Emoji for ${c.name}`}
                                    maxLength={16}
                                    value={emojiEdits[c.id] !== undefined ? emojiEdits[c.id] : (c.emoji || '')}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setEmojiEdits(prev => ({ ...prev, [c.id]: val }));
                                    }}
                                    placeholder="(emoji)"
                                    disabled={emojiSaving[c.id]}
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    type="button"
                                    disabled={emojiSaving[c.id] || (emojiEdits[c.id] === undefined || emojiEdits[c.id] === (c.emoji || ''))}
                                    onClick={async () => {
                                        const draft = emojiEdits[c.id];
                                        setEmojiSaving(s => ({ ...s, [c.id]: true }));
                                        setCatError(null);
                                        try {
                                            const mod = await import('../api/stop_categories');
                                            await mod.updateStopCategory(c.id, { emoji: (draft || '').trim() || null });
                                            // Update local list without full refetch for snappier UX
                                            setCategories(list => list.map(x => x.id === c.id ? { ...x, emoji: (draft || '').trim() || null } : x));
                                        } catch (e) {
                                            setCatError(e.response?.data?.detail || e.message || 'Failed to update emoji');
                                        } finally {
                                            setEmojiSaving(s => ({ ...s, [c.id]: false }));
                                        }
                                    }}
                                >{emojiSaving[c.id] ? 'Saving...' : 'Save'}</Button>
                                {c.name !== 'other' && (
                                    <Button type="button" size="sm" variant="danger" onClick={() => deleteCategory(c)} disabled={emojiSaving[c.id]} style={{ marginLeft: 'auto' }}>Delete</Button>
                                )}
                            </CategoryRow>
                        ))}
                        {categories.length === 0 && <li><Text variant="muted">No categories yet.</Text></li>}
                    </ul>
                )}
                <form onSubmit={addCategory} style={{ marginTop: '12px' }}>
                    <Label htmlFor="newCategory">Add Category</Label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <Input id="newCategory" placeholder="e.g. museum" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
                        <Button type="submit" variant="primary" disabled={catLoading || !newCategory.trim()}>Add</Button>
                    </div>
                </form>
            </Section>
            <Section>
                <h2>Database Backups</h2>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <Button type="button" variant="primary" disabled={creatingBackup} onClick={onCreateBackup}>{creatingBackup ? 'Creating...' : 'Create Backup'}</Button>
                    <Button type="button" variant="secondary" disabled={backupLoading} onClick={fetchBackups}>{backupLoading ? 'Refreshing...' : 'Refresh List'}</Button>
                </div>
                {backupError && <Text variant="danger" style={{ display: 'block', marginBottom: '8px' }}>{backupError}</Text>}
                {restoreLog && <Text variant="success" style={{ display: 'block', marginBottom: '8px', whiteSpace: 'pre-wrap' }}>{restoreLog.slice(0, 4000)}</Text>}
                {backupLoading && <Text variant="muted">Loading backups...</Text>}
                {!backupLoading && (
                    <div style={{ marginTop: '8px' }}>
                        {backups.length === 0 && <Text variant="muted">No backups found.</Text>}
                        {backups.length > 0 && (
                            <BackupTable>
                                <thead>
                                    <tr>
                                        <th>Filename</th>
                                        <th>Size</th>
                                        <th>Modified (UTC)</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {backups.map(b => (
                                        <tr key={b.filename}>
                                            <td style={{ wordBreak: 'break-all' }}>{b.filename}</td>
                                            <td>{(b.size_bytes / 1024).toFixed(1)} KB</td>
                                            <td>{b.modified_utc}</td>
                                            <td>
                                                <Button size="sm" variant="outline" type="button" onClick={() => onDownload(b)} style={{ marginRight: '6px' }}>Download</Button>
                                                <Button size="sm" variant="danger" type="button" onClick={() => { setSelectedRestore(b.filename); }} style={{ marginRight: '6px' }}>Select</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </BackupTable>
                        )}
                        {selectedRestore && (
                            <div style={{ marginTop: '12px' }}>
                                <Text>Selected for restore: {selectedRestore}</Text>{' '}
                                <Button type="button" variant="danger" disabled={restoreUploading} onClick={onRestoreFilename} style={{ marginLeft: '8px' }}>{restoreUploading ? 'Restoring...' : 'Restore'}</Button>
                                <Button type="button" variant="outline" disabled={restoreUploading} onClick={() => setSelectedRestore('')} style={{ marginLeft: '8px' }}>Clear</Button>
                            </div>
                        )}
                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                            <Label htmlFor="restoreUpload">Upload & Restore (.dump/.sql)</Label>
                            <input id="restoreUpload" type="file" accept=".dump,.sql" disabled={restoreUploading} onChange={onRestoreFile} />
                        </div>
                        <Hint style={{ display: 'block', marginTop: '8px' }}>Restore overwrites current database. Use with caution.</Hint>
                    </div>
                )}
            </Section>
            </Sections>
        </div>
    );
};

export default Settings;
