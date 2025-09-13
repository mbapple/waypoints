import React, { useEffect, useState } from 'react';
import { Card, Form, FormGroup, Label, Input, Select, Button, Text } from '../styles/components';
import { useSettings } from '../context/SettingsContext';
import styled from 'styled-components';

const Spacer = styled.div`
    margin-top: 20px;
`;

const Settings = () => {
    const { settings, setTheme, setOrsApiKey, setFontScale } = useSettings();
    // Stop categories state
    const [categories, setCategories] = useState([]);
    const [newCategory, setNewCategory] = useState('');
    const [catLoading, setCatLoading] = useState(false);
    const [catError, setCatError] = useState(null);
    const [themeLocal, setThemeLocal] = useState(settings.theme || 'dark');
    const [orsKeyLocal, setOrsKeyLocal] = useState(settings.orsApiKey || '');
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
        setOrsKeyLocal(settings.orsApiKey || '');
        setFontScaleLocal(settings.fontScale || 1);
    }, [settings.theme, settings.orsApiKey, settings.fontScale]);

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
        setOrsApiKey(orsKeyLocal.trim());
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
        <Spacer>
            <Card>
                <h2>Settings</h2>
                <Form onSubmit={onSave}>
                    <FormGroup>
                        <Label htmlFor="theme">Theme</Label>
                        <Select id="theme" value={themeLocal} onChange={(e) => setThemeLocal(e.target.value)}>
                            <option value="dark">Dark</option>
                            <option value="light">Light</option>
                        </Select>
                        <Text variant="muted">Switches the visual theme across the app instantly.</Text>
                    </FormGroup>

                    <FormGroup>
                        <Label htmlFor="orsKey">OpenRouteService API Key</Label>
                        <Input id="orsKey" placeholder="sk_..." value={orsKeyLocal} onChange={(e) => setOrsKeyLocal(e.target.value)} />
                        <Text variant="muted">Used to auto-fill driving legs with distance, time, and route polyline.</Text>
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
                        <Text variant="muted">Current scale: {fontScaleLocal.toFixed(2)}×</Text>
                    </FormGroup>

                    <Button type="submit" variant="primary">Save</Button>
                    {saved && <Text variant="success">Saved</Text>}
                </Form>
            </Card>
            <Spacer />
            <Card>
                <h2>Stop Categories</h2>
                {catError && <Text variant="danger" style={{ marginBottom: '8px' }}>{catError}</Text>}
                {catLoading && <Text variant="muted">Loading...</Text>}
                {!catLoading && (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {categories.map(c => (
                            <li key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #333' }}>
                                <span>{c.name}</span>
                                {c.name !== 'other' && (
                                    <Button type="button" variant="danger" onClick={() => deleteCategory(c)} style={{ marginLeft: '12px' }}>Delete</Button>
                                )}
                            </li>
                        ))}
                        {categories.length === 0 && <li><Text variant="muted">No categories yet.</Text></li>}
                    </ul>
                )}
                <form onSubmit={addCategory} style={{ marginTop: '16px' }}>
                    <Label htmlFor="newCategory">Add Category</Label>
                    <Input id="newCategory" placeholder="e.g. museum" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
                    <div style={{ marginTop: '8px' }}>
                        <Button type="submit" variant="primary" disabled={catLoading || !newCategory.trim()}>Add</Button>
                    </div>
                </form>
            </Card>
            <Spacer />
            <Card>
                <h2>Database Backups</h2>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '12px 0' }}>
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
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left' }}>
                                        <th style={{ padding: '4px 6px', borderBottom: '1px solid #333' }}>Filename</th>
                                        <th style={{ padding: '4px 6px', borderBottom: '1px solid #333' }}>Size</th>
                                        <th style={{ padding: '4px 6px', borderBottom: '1px solid #333' }}>Modified (UTC)</th>
                                        <th style={{ padding: '4px 6px', borderBottom: '1px solid #333' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {backups.map(b => (
                                        <tr key={b.filename} style={{ borderBottom: '1px solid #222' }}>
                                            <td style={{ padding: '4px 6px', wordBreak: 'break-all' }}>{b.filename}</td>
                                            <td style={{ padding: '4px 6px' }}>{(b.size_bytes / 1024).toFixed(1)} KB</td>
                                            <td style={{ padding: '4px 6px' }}>{b.modified_utc}</td>
                                            <td style={{ padding: '4px 6px' }}>
                                                <Button size="sm" variant="outline" type="button" onClick={() => onDownload(b)} style={{ marginRight: '6px' }}>Download</Button>
                                                <Button size="sm" variant="danger" type="button" onClick={() => { setSelectedRestore(b.filename); }} style={{ marginRight: '6px' }}>Select</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        {selectedRestore && (
                            <div style={{ marginTop: '12px' }}>
                                <Text>Selected for restore: {selectedRestore}</Text>{' '}
                                <Button type="button" variant="danger" disabled={restoreUploading} onClick={onRestoreFilename} style={{ marginLeft: '8px' }}>{restoreUploading ? 'Restoring...' : 'Restore'}</Button>
                                <Button type="button" variant="outline" disabled={restoreUploading} onClick={() => setSelectedRestore('')} style={{ marginLeft: '8px' }}>Clear</Button>
                            </div>
                        )}
                        <div style={{ marginTop: '16px' }}>
                            <Label htmlFor="restoreUpload">Upload & Restore (.dump/.sql)</Label>
                            <input id="restoreUpload" type="file" accept=".dump,.sql" disabled={restoreUploading} onChange={onRestoreFile} />
                        </div>
                        <Text variant="muted" style={{ display: 'block', marginTop: '8px' }}>Restore overwrites current database. Use with caution.</Text>
                    </div>
                )}
            </Card>
        </Spacer>
    );
};

export default Settings;
