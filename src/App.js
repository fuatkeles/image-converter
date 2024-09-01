import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';

function LocationMarker({ location, setLocation }) {
  useMapEvents({
    click(e) {
      setLocation(e.latlng);
    },
  });

  return location ? <Marker position={location} /> : null;
}

function SearchControl({ setLocation }) {
  const map = useMap();

  useEffect(() => {
    const provider = new OpenStreetMapProvider();

    const searchControl = new GeoSearchControl({
      provider,
      style: 'bar',
      showMarker: true,
      showPopup: false,
      autoClose: true,
      retainZoomLevel: false,
      animateZoom: true,
      keepResult: true,
    });

    map.addControl(searchControl);

    map.on('geosearch/showlocation', (result) => {
      if (result && result.location) {
        setLocation({
          lat: result.location.y,
          lng: result.location.x
        });
      }
    });

    return () => map.removeControl(searchControl);
  }, [map, setLocation]);

  return null;
}

function App() {
  const [images, setImages] = useState([]);
  const [convertedImages, setConvertedImages] = useState({});
  const [location, setLocation] = useState(null);
  const [geotagged, setGeotagged] = useState({});

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
  };

  const handleConvert = async (index) => {
    const formData = new FormData();
    formData.append('image', images[index]);

    try {
      const response = await axios.post('http://localhost:5001/convert', formData, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      setConvertedImages((prev) => ({ ...prev, [index]: url }));
    } catch (error) {
      console.error('Error converting image:', error);
    }
  };

  const handleAddGeotag = async (index) => {
    if (!location) {
      console.error('Location is not set');
      return;
    }

    const formData = new FormData();
    formData.append('image', images[index]);
    formData.append('latitude', location.lat);
    formData.append('longitude', location.lng);

    try {
      const response = await axios.post('http://localhost:5001/add-geotag', formData, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      setConvertedImages((prev) => ({ ...prev, [index]: url }));
      setGeotagged((prev) => ({ ...prev, [index]: true }));
    } catch (error) {
      console.error('Error adding geotag:', error);
    }
  };

  const getWebpFileName = (originalName) => {
    const nameWithoutExtension = originalName.replace(/\.[^/.]+$/, "");
    return `${nameWithoutExtension}.webp`;
  };

  return (
    <div>
      <MapContainer center={[51.505, -0.09]} zoom={13} style={{ height: '400px', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker location={location} setLocation={setLocation} />
        <SearchControl setLocation={setLocation} />
      </MapContainer>
      <input type="file" multiple onChange={handleFileChange} />
      <ul>
        {images.map((image, index) => (
          <li key={index}>
            {image.name}
            <button onClick={() => handleConvert(index)}>Convert</button>
            {location && <button onClick={() => handleAddGeotag(index)}>Add Geotag</button>}
            {geotagged[index] && (
              <a href={convertedImages[index]} download={getWebpFileName(image.name)}>
                Download
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;