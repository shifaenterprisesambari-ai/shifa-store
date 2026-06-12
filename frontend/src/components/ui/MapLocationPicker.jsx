import { useState, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import { FiSearch, FiX, FiMapPin, FiNavigation } from 'react-icons/fi';
import { GOOGLE_MAPS_KEY } from '../../constants';
import { Spinner } from './Loaders';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const defaultCenter = { lat: 26.100511, lng: 90.41108 };

const MapLocationPicker = ({
  initialCoords,
  initialAddress = '',
  onSelect,
  onClose,
  title = 'Select Location'
}) => {
  const [coords, setCoords] = useState(
    initialCoords && initialCoords.latitude && initialCoords.longitude
      ? { lat: Number(initialCoords.latitude), lng: Number(initialCoords.longitude) }
      : defaultCenter
  );
  const [address, setAddress] = useState(initialAddress);
  const [searchQuery, setSearchQuery] = useState(initialAddress);
  const [map, setMap] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_KEY
  });

  const reverseGeocode = (coordsObj) => {
    if (!window.google) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: coordsObj }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const formatted = results[0].formatted_address;
        setAddress(formatted);
        setSearchQuery(formatted);
      } else {
        console.error('Reverse geocoding failed:', status);
      }
    });
  };

  // Perform reverse geocoding if initial coordinates were set but address was empty
  useEffect(() => {
    if (isLoaded && coords && !initialAddress) {
      reverseGeocode(coords);
    }
  }, [isLoaded]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !window.google) return;
    setIsSearching(true);

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: searchQuery }, (results, status) => {
      setIsSearching(false);
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location;
        const newCoords = { lat: loc.lat(), lng: loc.lng() };
        setCoords(newCoords);
        setAddress(results[0].formatted_address);
        setSearchQuery(results[0].formatted_address);
        if (map) {
          map.panTo(newCoords);
          map.setZoom(16);
        }
      } else {
        toast.error('Address not found. Please try a different query.');
      }
    });
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    toast.loading('Locating you...', { id: 'geo-locate' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        toast.dismiss('geo-locate');
        const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(newCoords);
        reverseGeocode(newCoords);
        if (map) {
          map.panTo(newCoords);
          map.setZoom(16);
        }
        toast.success('Location updated!');
      },
      (err) => {
        toast.dismiss('geo-locate');
        toast.error('Unable to retrieve your location. Check your GPS settings.');
        console.error(err);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleDragEnd = (e) => {
    const newCoords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setCoords(newCoords);
    reverseGeocode(newCoords);
  };

  const handleConfirm = () => {
    if (!address) {
      toast.error('Please select a valid location with an address.');
      return;
    }
    onSelect({
      address,
      latitude: coords.lat,
      longitude: coords.lng
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-border/20 overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/40 bg-bg-secondary/40">
          <div className="flex items-center gap-2">
            <FiMapPin className="text-primary w-5 h-5" />
            <h2 className="text-base font-bold text-text">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-bg-tertiary transition-colors cursor-pointer text-text-secondary hover:text-text"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col relative min-h-[300px]">
          {/* Search bar overlays the map */}
          <form
            onSubmit={handleSearch}
            className="absolute top-4 left-4 right-4 z-10 flex gap-2"
          >
            <div className="flex-1 relative shadow-lg rounded-2xl overflow-hidden bg-white border border-border/60">
              <input
                type="text"
                placeholder="Search street, area, or landmark..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-12 py-3 bg-white text-sm focus:outline-none placeholder:text-text-tertiary"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl text-text-secondary hover:text-primary hover:bg-bg-secondary transition-all cursor-pointer"
              >
                {isSearching ? (
                  <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                ) : (
                  <FiSearch className="w-4 h-4" />
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={handleLocateMe}
              className="p-3 bg-white text-primary border border-border/60 rounded-2xl shadow-lg hover:bg-bg-secondary transition-all cursor-pointer flex items-center justify-center shrink-0"
              title="Locate current position"
            >
              <FiNavigation className="w-5 h-5" />
            </button>
          </form>

          {/* Map display */}
          {!isLoaded ? (
            <div className="flex-1 flex flex-col items-center justify-center py-24 bg-bg-secondary">
              {loadError ? (
                <div className="text-center text-error text-sm font-semibold">
                  Error loading Google Maps script. Check your API key or connection.
                </div>
              ) : (
                <>
                  <Spinner className="mb-4" />
                  <span className="text-xs text-text-secondary font-bold">Loading Maps Service...</span>
                </>
              )}
            </div>
          ) : (
            <div className="w-full relative" style={{ height: '380px' }}>
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '380px' }}
                center={coords}
                zoom={15}
                onLoad={(mapInstance) => setMap(mapInstance)}
                options={{
                  disableDefaultUI: true,
                  zoomControl: true,
                  mapTypeControl: false,
                  streetViewControl: false,
                  fullscreenControl: false
                }}
              >
                <MarkerF
                  position={coords}
                  draggable={true}
                  onDragEnd={handleDragEnd}
                  animation={window.google?.maps?.Animation?.DROP}
                />
              </GoogleMap>
              <div className="absolute bottom-4 left-4 text-[10px] bg-black/60 text-white/90 px-2.5 py-1 rounded-md font-semibold pointer-events-none backdrop-blur-sm">
                💡 Drag the pin to adjust your exact location
              </div>
            </div>
          )}
        </div>

        {/* Selected Address Display & Confirmation Footer */}
        <div className="p-4 border-t border-border/40 bg-bg-secondary/40 space-y-4">
          <div className="bg-white p-3 rounded-2xl border border-border/50 flex gap-3 items-start shadow-sm">
            <FiMapPin className="text-error w-4 h-4 shrink-0 mt-2.5" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-text-secondary uppercase tracking-wider">Pinned Address (You can edit manually)</p>
              <textarea
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setSearchQuery(e.target.value);
                }}
                className="w-full text-xs text-text font-bold mt-1 bg-bg-secondary p-2.5 rounded-xl border border-border/30 focus:outline-none focus:border-primary/45 focus:bg-white transition-all resize-none h-16 leading-relaxed"
                placeholder="Type or edit your delivery address manually here..."
              />
              {coords && (
                <p className="text-[9px] text-text-tertiary font-medium mt-1">
                  Lat: {coords.lat.toFixed(6)}, Lng: {coords.lng.toFixed(6)}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-bg-tertiary hover:bg-bg-tertiary/80 text-text-secondary hover:text-text text-sm font-semibold rounded-2xl transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!address}
              className="flex-1 py-3 gradient-primary text-white text-sm font-bold rounded-2xl hover:shadow-lg hover:shadow-primary/20 transition-all cursor-pointer disabled:opacity-50 text-center"
            >
              Confirm Location
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MapLocationPicker;
