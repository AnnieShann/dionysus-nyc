import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Report, Spot } from './module_bindings/types';
import {
  STATUS_META,
  NO_DATA_COLOR,
  NO_DATA_RGB,
  STALE_MS,
  BURST_MS,
  colorForSpot,
  pinVisual,
  formatAge,
  tsToMs,
  type Status,
} from './pulse';

const CENTER: [number, number] = [40.7484, -73.9879]; // Herald Square

function makeIcon(
  color: string,
  rgb: [number, number, number],
  vis: { core: number; aura: number; auraOpacity: number; glow: string },
  live: boolean,
  hot: boolean,
  selected: boolean,
  burst: boolean,
  waitMinutes: number | null
): L.DivIcon {
  const cls = [
    'pin',
    live ? 'pin--live' : '',
    hot ? 'pin--hot' : '',
    selected ? 'pin--selected' : '',
  ].join(' ');
  const style =
    `--c:${color};--rgb:${rgb[0]},${rgb[1]},${rgb[2]};` +
    `--core:${vis.core}px;--aura:${vis.aura}px;--aura-o:${vis.auraOpacity};--glow:${vis.glow}`;
  return L.divIcon({
    className: 'pin-wrap',
    html: `<div class="${cls}" style="${style}">
      ${vis.aura > 0 ? '<span class="pin-aura"></span>' : ''}
      ${hot ? '<span class="pin-ring"></span>' : ''}
      ${burst ? '<span class="pin-burst"></span><span class="pin-burst pin-burst--2"></span>' : ''}
      <span class="pin-core"></span>
      ${waitMinutes != null ? `<span class="pin-wait">${waitMinutes}m</span>` : ''}
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    tooltipAnchor: [0, -16],
  });
}

function PinMarker({
  spot,
  latest,
  score,
  waitMinutes,
  now,
  selected,
  onSelect,
}: {
  spot: Spot;
  latest: Report | undefined;
  score: number; // 0–100 heat
  waitMinutes: number | null; // current wait (fresh) or null
  now: number;
  selected: boolean;
  onSelect: (id: bigint) => void;
}) {
  const fresh = !!latest && now - tsToMs(latest.createdAt) <= STALE_MS;
  const color = colorForSpot(latest, now);
  const status = fresh && latest ? (latest.status as Status) : undefined;
  const rgb = status ? STATUS_META[status].rgb : NO_DATA_RGB;
  const heat = fresh ? score / 100 : 0; // pin glow/size scale with the heat score
  const vis = pinVisual(rgb, heat, fresh);
  const hot = fresh && score >= 55;
  const burstKey = latest && now - tsToMs(latest.createdAt) <= BURST_MS ? latest.id.toString() : '';

  const icon = useMemo(
    () => makeIcon(color, rgb, vis, fresh, hot, selected, burstKey !== '', waitMinutes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [color, vis.core, vis.aura, vis.auraOpacity, vis.glow, fresh, hot, selected, burstKey, waitMinutes]
  );

  return (
    <Marker
      position={[spot.latitude, spot.longitude]}
      icon={icon}
      eventHandlers={{ click: () => onSelect(spot.id) }}
    >
      <Tooltip className="pulse-tip" direction="top" opacity={1}>
        <div style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{spot.name}</div>
        <div style={{ marginTop: 2 }}>
          {fresh && latest ? (
            <span style={{ color: STATUS_META[latest.status as Status]?.color }}>
              ● {STATUS_META[latest.status as Status]?.label ?? latest.status}
              <span style={{ color: 'var(--fg-3)' }}> · {formatAge(now - tsToMs(latest.createdAt))}</span>
            </span>
          ) : (
            <span style={{ color: NO_DATA_COLOR }}>● No data</span>
          )}
        </div>
      </Tooltip>
    </Marker>
  );
}

function PanToSelected({ spot, enabled }: { spot: Spot | null; enabled: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!spot) return;
    map.setView([spot.latitude, spot.longitude], Math.max(map.getZoom(), 15), { animate: true });
    if (enabled) map.panBy([0, Math.round(map.getSize().y * 0.16)], { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spot?.id, enabled]);
  return null;
}

type Props = {
  spots: readonly Spot[];
  latestBySpot: Map<bigint, Report>;
  heatBySpot: Map<bigint, number>;
  waitBySpot: Map<bigint, { minutes: number; ageMs: number }>;
  now: number;
  selectedId: bigint | null;
  selectedSpot: Spot | null;
  onSelect: (id: bigint) => void;
  panOnSelect: boolean;
};

export default function MapView({
  spots,
  latestBySpot,
  heatBySpot,
  waitBySpot,
  now,
  selectedId,
  selectedSpot,
  onSelect,
  panOnSelect,
}: Props) {
  return (
    <MapContainer
      center={CENTER}
      zoom={14}
      className="h-full w-full"
      scrollWheelZoom
      zoomControl={false}
      attributionControl
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />
      {spots.map(spot => (
        <PinMarker
          key={spot.id.toString()}
          spot={spot}
          latest={latestBySpot.get(spot.id)}
          score={heatBySpot.get(spot.id) ?? 0}
          waitMinutes={waitBySpot.get(spot.id)?.minutes ?? null}
          now={now}
          selected={selectedId === spot.id}
          onSelect={onSelect}
        />
      ))}
      <PanToSelected spot={selectedSpot} enabled={panOnSelect} />
    </MapContainer>
  );
}
