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

    useEffect(() => {
        setThemeLocal(settings.theme || 'dark');
        setOrsKeyLocal(settings.orsApiKey || '');
        setFontScaleLocal(settings.fontScale || 1);
    }, [settings.theme, settings.orsApiKey, settings.fontScale]);

    useEffect(() => {
        // lazy load categories when page mounts
        fetchCategories();
    }, []);

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
        </Spacer>
    );
};

export default Settings;
