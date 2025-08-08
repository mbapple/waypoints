import React, { useEffect, useState } from 'react';
import { Card, Form, FormGroup, Label, Input, Select, Button, Text } from '../styles/components';
import { useSettings } from '../context/SettingsContext';
import styled from 'styled-components';

const Spacer = styled.div`
    margin-top: 20px;
`;

const Settings = () => {
    const { settings, setTheme, setOrsApiKey, setFontScale } = useSettings();
    const [themeLocal, setThemeLocal] = useState(settings.theme || 'dark');
    const [orsKeyLocal, setOrsKeyLocal] = useState(settings.orsApiKey || '');
    const [fontScaleLocal, setFontScaleLocal] = useState(settings.fontScale || 1);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setThemeLocal(settings.theme || 'dark');
        setOrsKeyLocal(settings.orsApiKey || '');
        setFontScaleLocal(settings.fontScale || 1);
    }, [settings.theme, settings.orsApiKey, settings.fontScale]);

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
        </Spacer>
    );
};

export default Settings;
