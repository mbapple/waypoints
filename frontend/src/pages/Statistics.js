import React, { useEffect, useMemo, useState } from "react";
import styled, { useTheme } from "styled-components";
import { Card, Grid, Text, Flex, Badge, Button } from "../styles/components";
import { PageHeader } from "../components/page-components";
import { getTripStatistics, getTripsByMiles, getTripsByNights, getLegsByType, getNodesByCountry, getNodesByState, getTripsByOsm, getTrip } from "../api/trips";
import { Link } from "react-router-dom";
import Popup from "../components/common/Popup";
import { getTransportTypeLabel, formatNumber } from "../utils/format";

const StatCard = styled(Card)`
	margin-bottom: 0;
	display: flex;
	flex-direction: column;
	height: 100%;
`;

const StatValue = styled.div`
	font-size: ${p => p.theme.fontSizes['3xl']};
	font-weight: ${p => p.theme.fontWeights.bold};
	color: ${p => p.theme.colors.text};
	line-height: 1.1;
`;

const StatLabel = styled(Text)`
	display: block;
	margin-top: ${p => p.theme.space[2]};
`;

const SectionTitle = styled.h2`
	margin-top: ${p => p.theme.space[8]};
	margin-bottom: ${p => p.theme.space[4]};
`;

const ChartCard = styled(Card)`
	overflow: hidden;
	height: 100%;
	margin-bottom: 0;
	display: flex;
	flex-direction: column;
`;

// Right-column stack helper: make children stack and fill available height
const ColumnStack = styled.div`
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0; /* allow inner flex to not force the grid row taller */
`;

// A ChartCard that grows to fill remaining vertical space in a ColumnStack
const GrowChartCard = styled(ChartCard)`
	flex: 1 1 auto;
	display: flex;
	flex-direction: column;
	min-height: 0; /* allow flex child to shrink inside grid cell */
	overflow: auto; /* scroll long content instead of expanding */
`;

// Add vertical spacing between stacked grid sections and stretch children for equal height
const SectionGrid = styled(Grid)`
	margin-bottom: ${p => p.theme.space[8]};
	align-items: stretch;
`;

const BarRow = styled.div`
	display: grid;
	grid-template-columns: 140px 1fr auto;
	align-items: center;
	gap: ${p => p.theme.space[4]};
	margin-bottom: ${p => p.theme.space[3]};

	@media (max-width: ${p => p.theme.breakpoints.sm}) {
		grid-template-columns: 1fr;
		align-items: flex-start;
	}
`;

const BarTrack = styled.div`
	width: 100%;
	height: 14px;
	background: ${p => p.theme.colors.surfaceHover};
	border: 1px solid ${p => p.theme.colors.border};
	border-radius: ${p => p.theme.radii.full};
	overflow: hidden;
`;

const BarFill = styled.div`
	height: 100%;
	width: ${p => p.width || 0}%;
	background: ${p => p.color};
`;

const TypeWrap = styled(Flex)`
	align-items: center;
	gap: ${p => p.theme.space[2]};
`;

const Swatch = styled.span`
	width: 16px;
	height: 16px;
	border-radius: 50%;
	background: ${p => p.color};
	display: inline-block;
`;

const TypeLabel = styled(Badge)`
	background: ${p => p.theme.colors.surfaceHover};
	color: ${p => p.theme.colors.textSecondary};
`;

const CountryList = styled(Card)`
	overflow-x: auto;
`;

const CountryRow = styled.div`
	border-bottom: 1px solid ${p => p.theme.colors.border};
	padding: ${p => p.theme.space[3]} 0;

	&:last-child {
		border-bottom: 0;
	}
`;

const Row = styled(Flex)`
	padding: 0.5rem 0;
	border-bottom: 1px solid ${p => p.theme.colors.border};
`;

const SubRow = styled(Flex)`
	padding: 0.4rem 0;
	border-bottom: 1px solid ${p => p.theme.colors.border};
`;

const RowHeader = styled.div`
	padding: 0.5rem 0;
	border-bottom: 1px solid ${p => p.theme.colors.border};
`;

const Chip = styled(Badge)`
	background: ${p => p.theme.colors.surfaceHover};
	margin: 2px 4px 2px 0;
`;

const Empty = styled(Text)`
	display: block;
	text-align: center;
	padding: ${p => p.theme.space[12]} 0;
`;

const EmptyDash = styled.div`
	height: 6px;
	width: 64px;
	border-radius: ${p => p.theme.radii.full};
	background: ${p => p.theme.colors.backgroundTertiary};
	opacity: 0.6;
`;

// use shared formatNumber from utils/format

const typeColor = (theme, type) => {
	switch ((type || '').toLowerCase()) {
		case 'car':
			return theme.colors.primary;
		case 'flight':
			return theme.colors.secondary;
		case 'train':
		case 'boat':
		case 'walk':
		default:
			return theme.colors.accent;
	}
};

export default function Statistics() {
	const theme = useTheme();
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	// popup state
	const [popup, setPopup] = useState({ open: false, title: "", content: null });

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const res = await getTripStatistics();
				if (mounted) setData(res);
			} catch (e) {
				console.error(e);
				setError("Failed to load statistics");
			} finally {
				if (mounted) setLoading(false);
			}
		})();
		return () => { mounted = false; };
	}, []);

	const milesByTypeArr = useMemo(() => {
		const m = data?.miles_by_type || {};
		return Object.entries(m)
			.map(([k, v]) => ({ type: k, miles: Number(v || 0) }))
			.sort((a, b) => b.miles - a.miles);
	}, [data]);

	const maxMiles = useMemo(() => {
		return milesByTypeArr.length ? Math.max(...milesByTypeArr.map(x => x.miles || 0)) : 0;
	}, [milesByTypeArr]);

	// shared popup helpers
	const showPlaceTrips = async (place) => {
		setPopup(p => ({ ...p, content: (
			<div>
				<RowHeader>
					<Text weight="semibold">{place.name || place.osm_id}</Text>
				</RowHeader>
				<Empty variant="muted">Loading trips…</Empty>
			</div>
		)}));
		try {
			const trips = await getTripsByOsm(place.osm_id);
			setPopup(p => ({ ...p, content: (
				<div>
					<RowHeader>
						<Text weight="semibold">{place.name || place.osm_id}</Text>
					</RowHeader>
					{trips.map(t => (
						<SubRow key={t.id} justify="space-between">
							<Link to={`/trip/${t.id}`}>{t.name}</Link>
						</SubRow>
					))}
				</div>
			)}));
		} catch (err) {
			const ids = Array.isArray(place.trip_ids) ? place.trip_ids : [];
			const tripDetails = await Promise.all(ids.map(async (id) => {
				try { return await getTrip(id); } catch { return { id, name: `Trip #${id}` }; }
			}));
			setPopup(p => ({ ...p, content: (
				<div>
					<RowHeader>
						<Text weight="semibold">{place.name || place.osm_id}</Text>
					</RowHeader>
					{tripDetails.length === 0 ? (
						<Empty variant="muted">No trips found for this place.</Empty>
					) : tripDetails.map(t => (
						<SubRow key={t.id} justify="space-between">
							<Link to={`/trip/${t.id}`}>{t.name}</Link>
						</SubRow>
					))}
				</div>
			)}));
		}
	};

	const renderPlaceRows = (rows) => (
		<div>
			{rows.map(n => (
				<div key={n.osm_id}>
					<Row justify="space-between" align="center">
						<Text weight="semibold">{n.name || n.osm_id}</Text>
						<Button variant="outline" size="sm" disabled={!n.osm_id} onClick={() => showPlaceTrips(n)}>View trips</Button>
					</Row>
				</div>
			))}
		</div>
	);

		// lazy loaders for popup
		const openTripsByMiles = async () => {
			setPopup({ open: true, title: "Trips by miles", content: <Empty variant="muted">Loading…</Empty> });
			try {
				const rows = await getTripsByMiles();
				setPopup({
					open: true,
					title: "Trips by miles",
					content: (
						<div>
							{rows.map(r => (
								<Flex key={r.id} justify="space-between" style={{ padding: '0.5rem 0', borderBottom: `1px solid ${theme.colors.border}` }}>
									<Link to={`/trip/${r.id}`}>{r.name}</Link>
									<Text>{r.total_miles?.toLocaleString?.() || r.total_miles} mi</Text>
								</Flex>
							))}
						</div>
					)
				});
			} catch (e) {
				setPopup({ open: true, title: "Trips by miles", content: <Text variant="danger">Failed to load</Text> });
			}
		};

		const openTripsByNights = async () => {
			setPopup({ open: true, title: "Trips by nights", content: <Empty variant="muted">Loading…</Empty> });
			try {
				const rows = await getTripsByNights();
				setPopup({
					open: true,
					title: "Trips by nights",
					content: (
						<div>
							{rows.map(r => (
								<Flex key={r.id} justify="space-between" style={{ padding: '0.5rem 0', borderBottom: `1px solid ${theme.colors.border}` }}>
									<Link to={`/trip/${r.id}`}>{r.name}</Link>
									<Text>{r.nights} nights</Text>
								</Flex>
							))}
						</div>
					)
				});
			} catch (e) {
				setPopup({ open: true, title: "Trips by nights", content: <Text variant="danger">Failed to load</Text> });
			}
		};

		const openLegsByType = async (type) => {
			setPopup({ open: true, title: `Legs: ${type}`, content: <Empty variant="muted">Loading…</Empty> });
			try {
				const rows = await getLegsByType(type);
				setPopup({
					open: true,
					title: `Legs: ${type}`,
					content: (
						<div>
							{rows.map(r => {
								const label = getTransportTypeLabel(r.type);
								const start = r.start_name || 'Unknown';
								const end = r.end_name || 'Unknown';
								return (
									<div key={r.id}>
										<Row direction="column">
											<Text>{`${label} ${start} to ${end}`}</Text>
											<Flex justify="space-between" style={{ marginTop: '0.25rem' }}>
												<Link to={`/trip/${r.trip_id}`}>{r.trip_name}</Link>
												<Text>{formatNumber(r.miles)} mi</Text>
											</Flex>
										</Row>
									</div>
								);
							})}
						</div>
					)
				});
			} catch (e) {
				setPopup({ open: true, title: `Legs: ${type}`, content: <Text variant="danger">Failed to load</Text> });
			}
		};

		const openPlacesByCountry = async (country) => {
			setPopup({ open: true, title: `Places in ${country}`, content: <Empty variant="muted">Loading…</Empty> });
			try {
				const rows = await getNodesByCountry(country);
				setPopup({
					open: true,
					title: `Places in ${country}`,
					content: renderPlaceRows(rows)
				});
			} catch (e) {
				setPopup({ open: true, title: `Places in ${country}`, content: <Text variant="danger">Failed to load</Text> });
			}
		};

		const openPlacesByState = async (state, country) => {
			const title = country ? `Places in ${state}, ${country}` : `Places in ${state}`;
			setPopup({ open: true, title, content: <Empty variant="muted">Loading…</Empty> });
			try {
				const rows = await getNodesByState(state, country);
				setPopup({
					open: true,
					title,
					content: renderPlaceRows(rows)
				});
			} catch (e) {
				setPopup({ open: true, title, content: <Text variant="danger">Failed to load</Text> });
			}
		};

	return (
		<div>
			<PageHeader>
				<h1>Statistics</h1>
				<Text variant="muted">Snapshot across all trips</Text>
			</PageHeader>

			{loading && (
				<Empty variant="muted">Loading statistics…</Empty>
			)}

			{!loading && error && (
				<Card>
					<Text variant="danger">{error}</Text>
				</Card>
			)}

			{!loading && !error && data && (
				<>
					{/* Top summary stats */}
					<SectionGrid columns={3}>
						<StatCard as={Button} onClick={openTripsByMiles} style={{ textAlign: 'left' }}>
							<StatValue>{formatNumber(data.all_trip_miles)}</StatValue>
							<StatLabel variant="muted">Total miles</StatLabel>
						</StatCard>
						<StatCard style={{ textAlign: 'left' }}>
							<StatValue>{formatNumber(data.unique_destination_count)}</StatValue>
							<StatLabel variant="muted">Unique destinations</StatLabel>
						</StatCard>
						<StatCard style={{ textAlign: 'left' }}>
							<StatValue>{formatNumber(data.country_count)}</StatValue>
							<StatLabel variant="muted">Countries visited</StatLabel>
						</StatCard>
						<StatCard>
							<StatValue>{formatNumber(data.state_count)}</StatValue>
							<StatLabel variant="muted">States visited</StatLabel>
						</StatCard>
					  </SectionGrid>

					  <SectionGrid columns={2}>
						{/* Miles by type */}
						<ChartCard>
							<SectionTitle>Miles by type</SectionTitle>
							{milesByTypeArr.length === 0 && (
								<Empty variant="muted">No mileage yet</Empty>
							)}
											{milesByTypeArr.map(({ type, miles }) => (
												<BarRow key={type} onClick={() => openLegsByType(type)} style={{ cursor: 'pointer' }}>
													<TypeWrap>
														<Swatch color={typeColor(theme, type)} />
														<TypeLabel>{type}</TypeLabel>
													</TypeWrap>
									<BarTrack>
														{maxMiles > 0 && miles > 0 && (
															<BarFill
																width={Math.round((miles / maxMiles) * 100)}
																color={typeColor(theme, type)}
															/>
														)}
									</BarTrack>
									<Text>{formatNumber(miles)} mi</Text>
								</BarRow>
							))}
						</ChartCard>

						{/* Total nights + Stops by category (stacked to match left card height) */}
						<ColumnStack>
							<StatCard as={Button} onClick={openTripsByNights} style={{ textAlign: 'left', marginBottom: '1rem' }}>
								<SectionTitle>Total nights</SectionTitle>
								<StatValue>{formatNumber(data.total_nights)}</StatValue>
								<StatLabel variant="muted">Nights between trip start/end</StatLabel>
							</StatCard>
							<GrowChartCard>
								<SectionTitle>Stops by category</SectionTitle>
								{Object.entries(data.stops_by_category || {}).map(([cat, count]) => (
									<Flex key={cat} justify="space-between" style={{ padding: '0.35rem 0', borderBottom: `1px solid ${theme.colors.border}` }}>
										<Text>{cat}</Text>
										<Badge variant="primary">{formatNumber(count)}</Badge>
									</Flex>
								))}
							</GrowChartCard>
						</ColumnStack>
						  </SectionGrid>

								{/* By Country */}
					<CountryList>
									<SectionTitle>By Country</SectionTitle>
						{Object.keys(data.states_by_country || {}).length === 0 && (
							<Empty variant="muted">No state data yet</Empty>
						)}
									{Object.entries(data.states_by_country || {}).map(([country, states]) => (
							<CountryRow key={country}>
								<Flex align="center" justify="space-between" wrap>
									<Flex align="center" gap={2} wrap>
													<Text weight="semibold" style={{ cursor: 'pointer' }} onClick={() => openPlacesByCountry(country)}>{country}</Text>
													<Badge variant="primary">{states?.length || 0} states</Badge>
													<Badge>{(data.destinations_by_country?.[country] ?? 0)} destinations</Badge>
									</Flex>
								</Flex>
											{Array.isArray(states) && states.length > 0 ? (
												<div style={{ marginTop: '0.5rem' }}>
													{states.map((s) => (
														<Chip key={s} onClick={() => openPlacesByState(s, country)} style={{ cursor: 'pointer' }}>{s}</Chip>
													))}
												</div>
											) : (
												<div style={{ marginTop: '0.5rem' }}>
													<EmptyDash />
												</div>
											)}
							</CountryRow>
						))}
					</CountryList>
				</>
			)}
				{popup.open && (
					<Popup title={popup.title} onClose={() => setPopup({ open: false, title: '', content: null })}>
						{popup.content}
					</Popup>
				)}
			</div>
	);
}

