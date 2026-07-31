import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FiSearch, FiX, FiMapPin, FiNavigation } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const defaultCenter = { lat: 26.103113, lng: 90.420934 };

// Custom red marker icon for Leaflet pin location picker
const customMarkerIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

/**
 * Reverse geocode via OpenStreetMap Nominatim API
 */
const reverseGeocodeOSM = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    return data.display_name || null;
  } catch {
    return null;
  }
};

/**
 * Forward search address via OpenStreetMap Nominatim API
 */
const searchAddressOSM = async (query) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return {
        lat: Number(data[0].lat),
        lng: Number(data[0].lon),
        displayName: data[0].display_name,
      };
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Helper component to handle Leaflet Map view updates and click/drag pin events
 */
function MapController({ coords, setCoords, performReverseGeocode }) {
  const map = useMap();

  useEffect(() => {
    if (coords && coords.lat && coords.lng) {
      map.setView([coords.lat, coords.lng], 16, { animate: true });
    }
  }, [coords, map]);

  useMapEvents({
    click(e) {
      const newCoords = { lat: e.latlng.lat, lng: e.latlng.lng };
      setCoords(newCoords);
      performReverseGeocode(newCoords);
    },
  });

  const eventHandlers = useMemo(
    () => ({
      dragend(e) {
        const marker = e.target;
        const position = marker.getLatLng();
        const newCoords = { lat: position.lat, lng: position.lng };
        setCoords(newCoords);
        performReverseGeocode(newCoords);
      },
    }),
    [setCoords, performReverseGeocode]
  );

  return (
    <Marker
      position={[coords.lat, coords.lng]}
      draggable={true}
      eventHandlers={eventHandlers}
      icon={customMarkerIcon}
    />
  );
}

const MapLocationPicker = ({
  initialCoords,
  initialAddress = '',
  onSelect,
  onClose,
  title = 'Pin Delivery Location',
}) => {
  const [coords, setCoords] = useState(
    initialCoords && initialCoords.latitude && initialCoords.longitude
      ? { lat: Number(initialCoords.latitude), lng: Number(initialCoords.longitude) }
      : defaultCenter
  );
  const [address, setAddress] = useState(initialAddress);
  const [searchQuery, setSearchQuery] = useState(initialAddress);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Reverse Geocoding with OpenStreetMap
  const performReverseGeocode = async (coordsObj) => {
    const osmAddr = await reverseGeocodeOSM(coordsObj.lat, coordsObj.lng);
    if (osmAddr) {
      setAddress(osmAddr);
      setSearchQuery(osmAddr);
    }
  };

  useEffect(() => {
    if (coords && !initialAddress) {
      performReverseGeocode(coords);
    }
  }, []);

  // Handle Search Submission
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);

    const osmRes = await searchAddressOSM(searchQuery);
    setIsSearching(false);

    if (osmRes) {
      const newCoords = { lat: osmRes.lat, lng: osmRes.lng };
      setCoords(newCoords);
      setAddress(osmRes.displayName);
      setSearchQuery(osmRes.displayName);
    } else {
      toast.error('Address not found. Please try a different landmark or area.');
    }
  };

  // Handle GPS Current Location
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    toast.loading('Acquiring high-accuracy GPS position...', { id: 'geo-locate' });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        toast.dismiss('geo-locate');
        const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(newCoords);
        await performReverseGeocode(newCoords);
        toast.success('Live location updated!');
      },
      (err) => {
        setIsLocating(false);
        toast.dismiss('geo-locate');
        toast.error('Unable to retrieve location. Please check browser GPS permissions.');
        console.error(err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleConfirm = () => {
    if (!address || !address.trim()) {
      toast.error('Please enter or select a valid delivery address.');
      return;
    }
    onSelect({
      address,
      latitude: coords.lat,
      longitude: coords.lng,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-border/20 overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-bg-secondary/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-sm shadow-md">
              📍
            </div>
            <div>
              <h2 className="text-base font-extrabold text-text">{title}</h2>
              <p className="text-[11px] text-text-secondary">Set your exact delivery pin for quick dispatch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-bg-secondary hover:bg-bg-tertiary transition-colors cursor-pointer text-text-secondary hover:text-text"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Top Search Bar */}
        <div className="p-3 bg-white border-b border-border/30">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative rounded-2xl overflow-hidden bg-bg-secondary border border-border/60 focus-within:border-primary/60 transition-colors">
              <input
                type="text"
                placeholder="Search street, area, or landmark..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-12 py-3 bg-transparent text-xs sm:text-sm text-text focus:outline-none placeholder:text-text-tertiary font-medium"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl text-text-secondary hover:text-primary hover:bg-white transition-all cursor-pointer"
              >
                {isSearching ? (
                  <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                ) : (
                  <FiSearch className="w-4.5 h-4.5" />
                )}
              </button>
            </div>

            {/* Locate Me GPS Button */}
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={isLocating}
              className="px-4 py-3 gradient-primary text-white text-xs font-bold rounded-2xl shadow-md hover:shadow-primary/30 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Use current GPS location"
            >
              {isLocating ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <FiNavigation className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Use GPS</span>
            </button>
          </form>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto flex flex-col z-0">
          {/* Leaflet Map Canvas */}
          <div className="relative h-[220px] sm:h-[260px] shrink-0 bg-bg-secondary z-0">
            <MapContainer
              center={[coords.lat, coords.lng]}
              zoom={16}
              scrollWheelZoom={true}
              style={{ width: '100%', height: '100%' }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapController
                coords={coords}
                setCoords={setCoords}
                performReverseGeocode={performReverseGeocode}
              />
            </MapContainer>

            {/* Floating Helper Pill */}
            <div className="absolute bottom-3 left-3 z-[400] text-[10.5px] bg-black/80 text-white px-3 py-1.5 rounded-xl font-bold backdrop-blur-md shadow-lg flex items-center gap-1.5 pointer-events-none">
              📍 Drag red pin or click map to set delivery location
            </div>
          </div>

          {/* Selected Address Display */}
          <div className="p-4 bg-white space-y-3 flex-1">
            <div className="bg-bg-secondary/70 p-3 rounded-2xl border border-border/50 shadow-inner">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black text-primary uppercase tracking-wider flex items-center gap-1">
                  <FiMapPin className="w-3.5 h-3.5 text-primary" /> Delivery Address Details
                </span>
                <span className="text-[9.5px] text-text-tertiary font-bold bg-white px-2 py-0.5 rounded-md border border-border/40">
                  Lat: {coords.lat.toFixed(5)}, Lng: {coords.lng.toFixed(5)}
                </span>
              </div>
              <textarea
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setSearchQuery(e.target.value);
                }}
                className="w-full text-xs text-text font-extrabold bg-white p-2.5 rounded-xl border border-border/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none h-14 leading-relaxed shadow-sm"
                placeholder="Type flat number, house name, or street details..."
              />
            </div>
          </div>
        </div>

        {/* Always Visible Sticky Footer Buttons */}
        <div className="p-4 border-t border-border/40 bg-white shrink-0">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text text-xs sm:text-sm font-bold rounded-2xl transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!address || !address.trim()}
              className="flex-1 py-3 gradient-primary text-white text-xs sm:text-sm font-black rounded-2xl hover:shadow-lg hover:shadow-primary/30 transition-all cursor-pointer disabled:opacity-50 text-center uppercase tracking-wider"
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
