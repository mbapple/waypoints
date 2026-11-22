import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useDocumentTitle from "../../utils/useDocumentTitle";
import { useNavigate, Link } from "react-router-dom";
import { ButtonGroup } from "../../components/input-components";
import { PageHeader } from "../../components/page-components";
import { Button, Text, Flex } from "../../styles/components";
import { createTripQuick } from "../../api/trips";
import { listDestinations, listAirports } from "../../api/destinations";
import QuickTripHeader from "../../components/quick-trip/QuickTripHeader";
import QuickNodeCard from "../../components/quick-trip/QuickNodeCard";
import QuickLegCard from "../../components/quick-trip/QuickLegCard";
import { QuickForm, ErrorSummary } from "../../components/quick-trip/quick-trip-styles";
import {
  initialQuickTripState, emptyNode, emptyLeg, resolveQuickTrip, buildQuickTripPayload,
} from "../../utils/quickTrip";

// FastAPI errors: { detail: "..." } or { detail: [{ loc, msg }, ...] }
function apiErrorMessage(err) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail.map(d => `${(d.loc || []).slice(1).join(".")}: ${d.msg}`).join("; ");
  }
  return "Couldn't create the trip. Nothing was saved; please try again.";
}

const applyPatch = (prev, patchOrFn) => {
  const patch = typeof patchOrFn === "function" ? patchOrFn(prev) : patchOrFn;
  return patch ? { ...prev, ...patch } : prev;
};

function CreateTripQuick() {
  useDocumentTitle("Quick create trip");
  const navigate = useNavigate();
  const [state, setState] = useState(initialQuickTripState);
  const [destinations, setDestinations] = useState([]);
  const [airports, setAirports] = useState([]);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const summaryRef = useRef(null);

  // Visited places (for the place search) and known airports (for flight defaults)
  useEffect(() => {
    let active = true;
    listDestinations().then(d => { if (active) setDestinations(Array.isArray(d) ? d : []); }).catch(() => {});
    listAirports().then(a => { if (active) setAirports(Array.isArray(a) ? a : []); }).catch(() => {});
    return () => { active = false; };
  }, []);

  const resolved = useMemo(() => resolveQuickTrip(state, { airports }), [state, airports]);

  // All updaters accept a patch or prev => patch (null = no change) and are stable
  const updateTrip = useCallback((patch) => {
    setState(s => ({ ...s, trip: applyPatch(s.trip, patch) }));
  }, []);

  const updateNode = useCallback((uid, patchOrFn) => {
    setState(s => {
      if (uid === "return") {
        const returnNode = applyPatch(s.returnNode, patchOrFn);
        return returnNode === s.returnNode ? s : { ...s, returnNode };
      }
      let changed = false;
      const nodes = s.nodes.map(n => {
        if (n.uid !== uid) return n;
        const next = applyPatch(n, patchOrFn);
        changed = next !== n;
        return next;
      });
      return changed ? { ...s, nodes } : s;
    });
  }, []);

  const updateLeg = useCallback((uid, patchOrFn) => {
    setState(s => {
      const prev = s.legs[uid] || emptyLeg();
      const next = applyPatch(prev, patchOrFn);
      return next === prev ? s : { ...s, legs: { ...s.legs, [uid]: next } };
    });
  }, []);

  const insertNodeAfter = (index) => {
    setState(s => {
      const nodes = [...s.nodes];
      nodes.splice(index + 1, 0, emptyNode());
      return { ...s, nodes };
    });
  };

  const removeNode = (uid) => {
    setState(s => {
      const legs = { ...s.legs };
      delete legs[uid];
      return { ...s, nodes: s.nodes.filter(n => n.uid !== uid), legs };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowErrors(true);
    setSaveError(null);
    if (resolved.errorList.length) {
      requestAnimationFrame(() => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    setSaving(true);
    try {
      const res = await createTripQuick(buildQuickTripPayload(resolved));
      navigate(`/trip/${res.id}`);
    } catch (err) {
      console.error(err);
      setSaveError(apiErrorMessage(err));
      requestAnimationFrame(() => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
    } finally {
      setSaving(false);
    }
  };

  const nodeByUid = Object.fromEntries(state.nodes.map(n => [n.uid, n]));
  const canRemove = state.nodes.length > 2;
  const errorsToShow = showErrors ? resolved.errorList : [];

  return (
    <div>
      <PageHeader>
        <Flex justify="space-between" align="flex-start" wrap gap={3}>
          <div>
            <h1>Quick Create Trip</h1>
            <Text variant="secondary" size="lg">
              Pick your stops and a start date; dates, names, distances and airports fill themselves in.
            </Text>
          </div>
          <Button as={Link} to="/create" variant="outline">← Back</Button>
        </Flex>
      </PageHeader>

      <QuickForm onSubmit={handleSubmit} noValidate>
        <QuickTripHeader
          trip={state.trip}
          resolved={resolved.trip}
          errors={resolved.errors}
          showErrors={showErrors}
          onChange={updateTrip}
        />

        <div>
          {resolved.nodes.map((rNode, i) => {
            const isReturn = Boolean(rNode.isReturn);
            const node = isReturn ? { ...state.returnNode, uid: "return" } : nodeByUid[rNode.uid];
            const rLeg = resolved.legs[i];
            return (
              <React.Fragment key={rNode.uid}>
                <QuickNodeCard
                  node={node}
                  resolved={rNode}
                  index={i}
                  localPlaces={destinations}
                  errors={resolved.errors}
                  showErrors={showErrors}
                  canRemove={canRemove && !isReturn}
                  onChange={(patch) => updateNode(rNode.uid, patch)}
                  onRemove={() => removeNode(rNode.uid)}
                  onInsertAfter={() => insertNodeAfter(state.nodes.findIndex(n => n.uid === rNode.uid))}
                />
                {rLeg && (
                  <QuickLegCard
                    key={`leg-${rLeg.uid}`}
                    leg={state.legs[rLeg.uid]}
                    resolved={rLeg}
                    errors={resolved.errors}
                    showErrors={showErrors}
                    localPlaces={destinations}
                    onChange={updateLeg}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <Flex justify="center">
          <Button type="button" variant="ghost" onClick={() => insertNodeAfter(state.nodes.length - 1)}>
            + Add stop{state.trip.roundTrip ? " (before the return)" : ""}
          </Button>
        </Flex>

        <div ref={summaryRef}>
          {(errorsToShow.length > 0 || saveError) && (
            <ErrorSummary role="alert">
              {saveError ? (
                <strong>{saveError}</strong>
              ) : (
                <>
                  <strong>Fix these before creating the trip:</strong>
                  <ul>{errorsToShow.map(e => <li key={e.key}>{e.message}</li>)}</ul>
                </>
              )}
            </ErrorSummary>
          )}
        </div>

        <ButtonGroup style={{ marginTop: 0 }}>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Creating…" : `Create trip (${resolved.nodes.length} stops, ${resolved.legs.length} legs)`}
          </Button>
        </ButtonGroup>
      </QuickForm>
    </div>
  );
}

export default CreateTripQuick;
