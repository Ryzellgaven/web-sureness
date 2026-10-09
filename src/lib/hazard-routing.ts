export interface SafeRoute {
  coordinates: [number, number][];
  distance: number;
  duration: number;
}

interface OsrmRouteResponse {
  code: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
  }[];
}

const HAZARD_CLEARANCE_METERS = 120;

function distanceToSegmentMeters(
  point: [number, number],
  start: [number, number],
  end: [number, number],
): number {
  const latitudeScale = 111_320;
  const longitudeScale = latitudeScale * Math.cos((point[0] * Math.PI) / 180);
  const project = ([latitude, longitude]: [number, number]): [number, number] => [
    latitude * latitudeScale,
    longitude * longitudeScale,
  ];
  const projectedPoint = project(point);
  const projectedStart = project(start);
  const projectedEnd = project(end);
  const segmentX = projectedEnd[0] - projectedStart[0];
  const segmentY = projectedEnd[1] - projectedStart[1];
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
  const progress = segmentLengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, (
      (projectedPoint[0] - projectedStart[0]) * segmentX
      + (projectedPoint[1] - projectedStart[1]) * segmentY
    ) / segmentLengthSquared));
  const closestX = projectedStart[0] + progress * segmentX;
  const closestY = projectedStart[1] + progress * segmentY;
  return Math.hypot(projectedPoint[0] - closestX, projectedPoint[1] - closestY);
}

function avoidsHazards(route: SafeRoute, hazards: [number, number][]): boolean {
  return hazards.every(hazard => route.coordinates.every((point, index, coordinates) => {
    if (index === 0) return distanceToSegmentMeters(hazard, point, point) > HAZARD_CLEARANCE_METERS;
    return distanceToSegmentMeters(hazard, coordinates[index - 1], point) > HAZARD_CLEARANCE_METERS;
  }));
}

export async function findSafeRoute(
  origin: [number, number],
  destination: [number, number],
  hazards: [number, number][],
): Promise<SafeRoute | null> {
  const coordinates = `${origin[1]},${origin[0]};${destination[1]},${destination[0]}`;
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${coordinates}?alternatives=3&overview=full&geometries=geojson&steps=false`,
  );
  if (!response.ok) throw new Error('Routing service is unavailable');

  const result = await response.json() as OsrmRouteResponse;
  if (result.code !== 'Ok' || !result.routes?.length) return null;

  const routes = result.routes.map(route => ({
    coordinates: route.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude] as [number, number]),
    distance: route.distance,
    duration: route.duration,
  }));
  return routes
    .filter(route => avoidsHazards(route, hazards))
    .sort((first, second) => first.duration - second.duration)[0] ?? null;
}