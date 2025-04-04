const worldbounds = () => ([
  new window.google.maps.LatLng(-85.1054596961173, -180),
  new window.google.maps.LatLng(85.1054596961173, -180),
  new window.google.maps.LatLng(85.1054596961173, 180),
  new window.google.maps.LatLng(-85.1054596961173, 180),
  new window.google.maps.LatLng(-85.1054596961173, 0)
]);

const getPolygonCenter = (coords) => {
  const numCoords = coords.length;
  let X = 0;
  let Y = 0;
  let Z = 0;

  for (let i = 0; i < numCoords; i++) {
    const { lng, lat } = coords[i];
    const latRad = (lat * Math.PI) / 180;
    const lngRad = (lng * Math.PI) / 180;
    const a = Math.cos(latRad) * Math.cos(lngRad);
    const b = Math.cos(latRad) * Math.sin(lngRad);
    const c = Math.sin(latRad);
    X += a;
    Y += b;
    Z += c;
  }

  X /= numCoords;
  Y /= numCoords;
  Z /= numCoords;

  const lngCenter = Math.atan2(Y, X);
  const hyp = Math.sqrt(X * X + Y * Y);
  const latCenter = Math.atan2(Z, hyp);

  return {
    lng: (lngCenter * 180) / Math.PI,
    lat: (latCenter * 180) / Math.PI
  };
};

export { worldbounds, getPolygonCenter };
