import React from "react";
import { Link } from "react-router-dom";
import { Card, Button, Text, Flex } from "../../styles/components";

/**
 * Catches render errors thrown by a page so one broken page can't blank the whole app.
 *
 * Without a boundary, React unmounts the entire tree when a page throws during a route
 * change, leaving the new URL in the address bar over an empty screen until a manual
 * refresh. The boundary is keyed by location in App.jsx, so navigating anywhere else
 * resets it. A page chunk that fails to download (e.g. after an update) also lands
 * here, and "Reload page" fetches the new one.
 */
export default class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Page failed to render:", error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <Card style={{ marginTop: "1.5rem" }}>
        <h2 style={{ marginTop: 0 }}>This page failed to load</h2>
        <Text variant="muted" size="sm" as="p" style={{ fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
          {String(error?.message || error)}
        </Text>
        <Flex gap={2} style={{ marginTop: "1rem" }}>
          <Button variant="primary" size="sm" onClick={() => window.location.reload()}>Reload page</Button>
          <Button as={Link} to="/" variant="outline" size="sm">All trips</Button>
        </Flex>
      </Card>
    );
  }
}
