import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FiNavigation, FiClock, FiMapPin, FiTruck } from 'react-icons/fi';

const defaultCenter = { lat: 26.103113, lng: 90.420934 };

// Rider Marker Icon (Blue/Cyan)
const riderMarkerIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Destination Marker Icon (Red)
const destMarkerIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

/**
 * Calculate approximate driving distance (in km) and duration (in mins) via Haversine formula + road multiplier
 */
function calculateRouteStats(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightDist = R * c;
  const roadDist = (straightDist * 1.3).toFixed(1); // 1.3 road curvature factor
  const mins = Math.max(3, Math.round((roadDist / 25) * 60)); // Avg driving 25 km/h
  return {
    distance: `${roadDist} km`,
    duration: `${mins} mins`,
  };
}

function MapViewController({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [bounds, map]);
  return null;
}

const DeliveryMap = ({
  riderLocation,
  destinationLocation,
  destinationType = 'shop',
  destinationName = 'Destination',
  destinationAddress = ''
}) => {
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');

  const riderCoords = riderLocation && (riderLocation.latitude || riderLocation.lat) && (riderLocation.longitude || riderLocation.lng)
    ? { lat: Number(riderLocation.latitude || riderLocation.lat), lng: Number(riderLocation.longitude || riderLocation.lng) }
    : null;

  const destCoords = destinationLocation && (destinationLocation.latitude || destinationLocation.lat) && (destinationLocation.longitude || destinationLocation.lng)
    ? { lat: Number(destinationLocation.latitude || destinationLocation.lat), lng: Number(destinationLocation.longitude || destinationLocation.lng) }
    : null;

  const mapCenter = destCoords || riderCoords || defaultCenter;

  useEffect(() => {
    if (riderCoords && destCoords) {
      const stats = calculateRouteStats(riderCoords.lat, riderCoords.lng, destCoords.lat, destCoords.lng);
      setDistance(stats.distance);
      setDuration(stats.duration);
    }
  }, [riderCoords?.lat, riderCoords?.lng, destCoords?.lat, destCoords?.lng]);

  const handleOpenExternalMaps = () => {
    let destParam = '';
    if (destCoords) {
      destParam = `${destCoords.lat},${destCoords.lng}`;
    } else if (destinationAddress) {
      destParam = encodeURIComponent(destinationAddress);
    } else {
      destParam = encodeURIComponent(destinationName);
    }

    let originParam = '';
    if (riderCoords) {
      originParam = `&origin=${riderCoords.lat},${riderCoords.lng}`;
    }

    const url = `https://www.google.com/maps/dir/?api=1${originParam}&destination=${destParam}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const bounds = [];
  if (riderCoords) bounds.push([riderCoords.lat, riderCoords.lng]);
  if (destCoords) bounds.push([destCoords.lat, destCoords.lng]);

  return (
    <div className="space-y-3">
      {/* Route Info Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-bg-secondary/60 border border-border/40 rounded-xl p-3 flex items-center gap-2">
          <FiTruck className="w-4 h-4 text-primary" />
          <div className="min-w-0">
            <span className="text-[10px] text-text-secondary font-bold block uppercase tracking-wider">Distance</span>
            <span className="text-xs font-black text-text">{distance || '1.5 km'}</span>
          </div>
        </div>
        <div className="bg-bg-secondary/60 border border-border/40 rounded-xl p-3 flex items-center gap-2">
          <FiClock className="w-4 h-4 text-success" />
          <div className="min-w-0">
            <span className="text-[10px] text-text-secondary font-bold block uppercase tracking-wider">Time</span>
            <span className="text-xs font-black text-text">{duration || '8 mins'}</span>
          </div>
        </div>
      </div>

      {/* Leaflet Map Canvas */}
      <div className="relative border border-border/40 rounded-2xl overflow-hidden bg-bg-secondary h-[340px] z-0">
        <MapContainer
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={14}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {bounds.length > 0 && <MapViewController bounds={bounds} />}

          {/* Polyline Route */}
          {riderCoords && destCoords && (
            <Polyline
              positions={[
                [riderCoords.lat, riderCoords.lng],
                [destCoords.lat, destCoords.lng],
              ]}
              pathOptions={{ color: '#FF7A00', weight: 4, opacity: 0.8, dashArray: '8, 8' }}
            />
          )}

          {/* Rider Marker */}
          {riderCoords && (
            <Marker position={[riderCoords.lat, riderCoords.lng]} icon={riderMarkerIcon} />
          )}

          {/* Destination Marker */}
          {destCoords && (
            <Marker position={[destCoords.lat, destCoords.lng]} icon={destMarkerIcon} />
          )}
        </MapContainer>

        {/* Floating Navigation button */}
        <button
          onClick={handleOpenExternalMaps}
          className="absolute bottom-4 right-4 bg-primary hover:bg-primary-dark text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg hover:shadow-primary/20 flex items-center gap-1.5 transition-all cursor-pointer z-[400]"
        >
          <FiNavigation className="w-4 h-4" /> Start Turn-by-Turn GPS
        </button>
      </div>

      {/* Target Address Panel */}
      <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 flex gap-2">
        <FiMapPin className="text-primary w-4 h-4 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <span className="text-[10px] text-primary font-black uppercase tracking-wider">
            {destinationType === 'shop' ? 'Pickup Store Location' : 'Deliver to Customer'}
          </span>
          <p className="text-xs font-bold text-text mt-0.5 leading-relaxed">
            {destinationName}
          </p>
          {destinationAddress && (
            <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
              {destinationAddress}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryMap;
