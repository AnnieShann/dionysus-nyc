import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Report, Spot } from './module_bindings/types';
import {
  STATUS_META,
  NO_DATA_COLOR,
  STALE_MS,
  BURST_MS,
  colorForSpot,
  formatAge,
  tsToMs,
  type Status,
} from './pulse';

const CENTER: [number, number] = [40.7484, -73.9879]; // Herald Square

function makeIcon(color: string, live: boolean, selected: boolean, burst: boolean): L.DivIcon {
  const cls = ['pin', live ? 'pin--live' : '', selected ? 'pin--selected' : ''].join(' ');
  return L.divIcon({
    className: 'pin-wrap',
    html: `<div class="${cls}" style="--c:${color}">
      ${live ? '<span class="pin-ring"></span>' : ''}
      ${burst ? '<span class="pin-burst"></span>' : ''}
      <span class="pin-core"></span>
    </div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    tooltipAnchor: [0, -14],
  });
}

function PinMarker({
  spot,
  latest,
  now,
  selected,
  onSelect,
}: {
  spot: Spot;
  latest: Report | undefined;
  now: number;
  selected: boolean;
  onSelect: (id: bigint) => void;
}) {
  const fresh = !!latest && now - tsToMs(latest.createdAt) <= STALE_MS;
  const color = colorForSpot(latest, now);
  // burstKey changes only when a *new, very recent* report arrives -> replays the burst.
  const burstKey = latest && now - tsToMs(latest.createdAt) <= BURST_MS ? latest.id.toString() : '';

  const icon = useMemo(
    () => makeIcon(color, fresh, selected, burstKey !== ''),
    [color, fresh, selected, burstKey]
  );

  return (
    <Marker
      position={[spot.latitude, spot.longitude]}
      icon={icon}
      eventHandlers={{ click: () => onSelect(spot.id) }}
    >
      <Tooltip className="pulse-tip" direction="top" opacity={1}>
        <div className="font-semibold text-white">{spot.name}</div>
        <div className="mt-0.5">
          {fresh && latest ? (
            <span style={{ color: STATUS_META[latest.status as Status]?.color }}>
              ● {STATUS_META[latest.status as Status]?.label ?? latest.status}
              <span className="text-zinc-400"> · {formatAge(now - tsToMs(latest.createdAt))}</span>
            </span>
          ) : (
            <span style={{ color: NO_DATA_COLOR }}>● no recent reports</span>
          )}
        </div>
      </Tooltip>
    </Marker>
  );
}

// Pans a selected spot into the visible area above the bottom sheet (mobile).
function PanToSelected({ spot, enabled }: { spot: Spot | null; enabled: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!spot) return;
    map.setView([spot.latitude, spot.longitude], Math.max(map.getZoom(), 15), { animate: true });
    if (enabled) {
      // nudge the centered point upward so the sheet doesn't cover it
      map.panBy([0, Math.round(map.getSize().y * 0.24)], { animate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spot?.id, enabled]);
  return null;
}

type Props = {
  spots: readonly Spot[];
  latestBySpot: Map<bigint, Report>;
  now: number;
  selectedId: bigint | null;
  selectedSpot: Spot | null;
  onSelect: (id: bigint) => void;
  panOnSelect: boolean;
};

export default function MapView({
  spots,
  latestBySpot,
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
        url="https://{s}.basemap.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />
      {spots.map(spot => (
        <PinMarker
          key={spot.id.toString()}
          spot={spot}
          latest={latestBySpot.get(spot.id)}
          now={now}
          selected={selectedId === spot.id}
          onSelect={onSelect}
        />
      ))}
      <PanToSelected spot={selectedSpot} enabled={panOnSelect} />
    </MapContainer>
  );
}
