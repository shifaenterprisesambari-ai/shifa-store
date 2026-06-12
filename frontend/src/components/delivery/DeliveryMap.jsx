import { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, DirectionsRenderer, MarkerF } from '@react-google-maps/api';
import { FiNavigation, FiClock, FiMapPin, FiTruck } from 'react-icons/fi';
import { GOOGLE_MAPS_KEY } from '../../constants';
import { Spinner } from '../ui/Loaders';

const mapContainerStyle = {
  width: '100%',
  height: '320px',
  borderRadius: '16px',
};

const DeliveryMap = ({
  riderLocation,
  destinationLocation,
  destinationType = 'shop',
  destinationName = 'Destination',
  destinationAddress = ''
}) => {
  const [directions, setDirections] = useState(null);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [map, setMap] = useState(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_KEY,
  });

  const riderCoords = riderLocation
    ? { lat: Number(riderLocation.latitude || riderLocation.lat), lng: Number(riderLocation.longitude || riderLocation.lng) }
    : null;

  const destCoords = destinationLocation
    ? { lat: Number(destinationLocation.latitude || destinationLocation.lat), lng: Number(destinationLocation.longitude || destinationLocation.lng) }
    : null;

  useEffect(() => {
    if (!window.google || !riderCoords || !destCoords) return;

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: new window.google.maps.LatLng(riderCoords.lat, riderCoords.lng),
        destination: new window.google.maps.LatLng(destCoords.lat, destCoords.lng),
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirections(result);
          if (result.routes[0]?.legs[0]) {
            const leg = result.routes[0].legs[0];
            setDistance(leg.distance?.text || '');
            setDuration(leg.duration?.text || '');
          }
        } else {
          console.error('Directions request failed:', status);
        }
      }
    );
  }, [riderCoords?.lat, riderCoords?.lng, destCoords?.lat, destCoords?.lng]);

  if (!isLoaded) {
    return (
      <div className="h-80 bg-bg-secondary rounded-2xl flex flex-col items-center justify-center border border-border/30">
        {loadError ? (
          <span className="text-xs text-error font-bold">Error loading maps</span>
        ) : (
          <>
            <Spinner className="mb-2" />
            <span className="text-xs text-text-secondary font-bold">Initializing Navigation Route...</span>
          </>
        )}
      </div>
    );
  }

  // Open native Google Maps app / web for turn-by-turn navigation
  const handleOpenGoogleMaps = () => {
    if (!riderCoords || !destCoords) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${riderCoords.lat},${riderCoords.lng}&destination=${destCoords.lat},${destCoords.lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-3">
      {/* Route Info Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-bg-secondary/60 border border-border/40 rounded-xl p-3 flex items-center gap-2">
          <FiTruck className="w-4 h-4 text-primary" />
          <div className="min-w-0">
            <span className="text-[10px] text-text-secondary font-bold block uppercase tracking-wider">Distance</span>
            <span className="text-xs font-black text-text">{distance || 'Calculating...'}</span>
          </div>
        </div>
        <div className="bg-bg-secondary/60 border border-border/40 rounded-xl p-3 flex items-center gap-2">
          <FiClock className="w-4 h-4 text-success" />
          <div className="min-w-0">
            <span className="text-[10px] text-text-secondary font-bold block uppercase tracking-wider">Time</span>
            <span className="text-xs font-black text-text">{duration || 'Calculating...'}</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative border border-border/40 rounded-2xl overflow-hidden bg-bg-secondary">
        {riderCoords && destCoords ? (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={riderCoords}
            zoom={14}
            onLoad={(mapInstance) => setMap(mapInstance)}
            options={{
              disableDefaultUI: true,
              zoomControl: true,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false
            }}
          >
            {/* Render Route path on Map */}
            {directions && (
              <DirectionsRenderer
                directions={directions}
                options={{
                  suppressMarkers: true,
                  polylineOptions: {
                    strokeColor: '#FF7A00',
                    strokeOpacity: 0.8,
                    strokeWeight: 5,
                  },
                }}
              />
            )}

            {/* Custom Marker for Rider */}
            <MarkerF
              position={riderCoords}
              title="Your Location"
              label={{ text: '🚴', fontSize: '16px' }}
            />

            {/* Custom Marker for Destination */}
            <MarkerF
              position={destCoords}
              title={destinationName}
              label={{ text: destinationType === 'shop' ? '🏪' : '🏠', fontSize: '16px' }}
            />
          </GoogleMap>
        ) : (
          <div className="h-80 flex items-center justify-center">
            <span className="text-xs text-text-secondary font-semibold">Waiting for GPS coordinates...</span>
          </div>
        )}

        {/* Floating Navigation button */}
        {riderCoords && destCoords && (
          <button
            onClick={handleOpenGoogleMaps}
            className="absolute bottom-4 right-4 bg-primary hover:bg-primary-dark text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg hover:shadow-primary/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FiNavigation className="w-4 h-4" /> Start Turn-by-Turn GPS
          </button>
        )}
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
