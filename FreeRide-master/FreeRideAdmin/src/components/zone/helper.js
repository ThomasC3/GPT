/* eslint-disable prefer-destructuring */
import nearestPointOnLine from '@turf/nearest-point-on-line';
import polygonToLineString from '@turf/polygon-to-line';
import turfDistance from '@turf/distance';
import * as turfHelpers from '@turf/helpers';
import { featureEach } from '@turf/meta';

const snappingTolerance = 1;

// Function to calculate the distance between a point and a polygon's boundary
function calculateDistanceToPolygonBoundary(point, polygon) {
  const lineString = polygonToLineString(polygon);
  const nearestPoint = nearestPointOnLine(lineString, point);
  const distance = turfDistance(point, nearestPoint, { units: 'kilometers' });
  return distance;
}

function findNearestChildPolygon(
  point,
  polygonsFeatureCollection,
  selectedPolygonId
) {
  let nearestDistance = Infinity;
  let nearestPolygon = null;

  featureEach(polygonsFeatureCollection, (feature) => {
    if (
      feature.geometry.type === 'Polygon'
      && feature.id !== selectedPolygonId
    ) {
      const distance = calculateDistanceToPolygonBoundary(point, feature);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestPolygon = feature;
      }
    }
  });
  return nearestPolygon;
}

export function snapToParentPolygon(coordinates, parentPolygonCoordinates) {
  const snappedCoordinates = coordinates.map((coord) => {
    const snappedCoord = coord.slice();
    const pt = turfHelpers.point(coord);
    const nearest = nearestPointOnLine(
      turfHelpers.lineString(parentPolygonCoordinates),
      pt
    );
    const distance = turfDistance(pt, nearest, { units: 'kilometers' });
    if (distance <= snappingTolerance) {
      snappedCoord[0] = nearest.geometry.coordinates[0];
      snappedCoord[1] = nearest.geometry.coordinates[1];
    }
    return snappedCoord;
  });
  return snappedCoordinates;
}

export function snapToPolygons(
  coordinates,
  parentPolygonCoordinates,
  polygonsFeatureCollection,
  selectedPolygonId
) {
  const snappedCoordinates = coordinates.map((coord) => {
    const snappedCoord = coord.slice(); // Make a copy of the coordinate
    const pt = turfHelpers.point(coord);

    const nearestParent = nearestPointOnLine(
      turfHelpers.lineString(parentPolygonCoordinates),
      pt
    );
    const nearestChild = findNearestChildPolygon(
      pt,
      polygonsFeatureCollection,
      selectedPolygonId
    );
    const distanceToParent = turfDistance(pt, nearestParent, {
      units: 'kilometers'
    });
    let distanceToChild = null;
    if (nearestChild) {
      distanceToChild = calculateDistanceToPolygonBoundary(pt, nearestChild);
    }
    if (
      distanceToParent <= snappingTolerance
      || (distanceToChild && distanceToChild <= snappingTolerance)
    ) {
      // Snapping to parent polygon takes precedence
      // if distance to parent is less then or equal to snapping tolerance, snap to parent
      // else if distance to child exists and is less then or equal to snapping tolerance, snap to child
      if (distanceToParent <= snappingTolerance) {
        snappedCoord[0] = nearestParent.geometry.coordinates[0];
        snappedCoord[1] = nearestParent.geometry.coordinates[1];
      } else if (distanceToChild && distanceToChild <= snappingTolerance) {
        const nearestPointOnChild = nearestPointOnLine(
          turfHelpers.lineString(nearestChild.geometry.coordinates[0]),
          pt
        );
        snappedCoord[0] = nearestPointOnChild.geometry.coordinates[0];
        snappedCoord[1] = nearestPointOnChild.geometry.coordinates[1];
      }
    }
    return snappedCoord;
  });

  return snappedCoordinates;
}

export function snapToZonePolygon(coordinates, polygonsFeatureCollection, selectedPolygonId) {
  const snappedCoordinates = coordinates.map((coord) => {
    const snappedCoord = coord.slice();
    const pt = turfHelpers.point(coord);

    const nearestChild = findNearestChildPolygon(
      pt,
      polygonsFeatureCollection,
      selectedPolygonId
    );

    let distanceToChild = null;
    if (nearestChild) {
      distanceToChild = calculateDistanceToPolygonBoundary(pt, nearestChild);
    }
    if (distanceToChild && distanceToChild <= snappingTolerance) {
      const nearestPointOnChild = nearestPointOnLine(
        turfHelpers.lineString(nearestChild.geometry.coordinates[0]),
        pt
      );
      snappedCoord[0] = nearestPointOnChild.geometry.coordinates[0];
      snappedCoord[1] = nearestPointOnChild.geometry.coordinates[1];
    }
    return snappedCoord;
  });

  return snappedCoordinates;
}
