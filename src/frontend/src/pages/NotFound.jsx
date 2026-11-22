import React from "react";
import { Link, useLocation } from "react-router-dom";
import { PageHeader } from "../components/page-components";
import { Button, Text } from "../styles/components";

// Rendered for any URL that matches no route, instead of an empty page.
export default function NotFound() {
  const { pathname } = useLocation();
  return (
    <PageHeader>
      <h1>Page not found</h1>
      <Text variant="muted" as="p">Nothing lives at <code>{pathname}</code>.</Text>
      <Button as={Link} to="/" variant="primary" size="sm" style={{ marginTop: "0.75rem" }}>
        Back to trips
      </Button>
    </PageHeader>
  );
}
