import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { FaUpload, FaTimes } from 'react-icons/fa'; // react-icons/fa modülünü içe aktar
import './App.css'; // Yeni CSS dosyasını içe aktar
import { FaCheckCircle } from 'react-icons/fa'; // Import the checkmark icon
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
  const [isDragActive, setIsDragActive] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [loading, setLoading] = useState({}); // Add this line to the state declarations

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setImages(files);
    setIsDragActive(false);
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
  
    setLoading((prev) => ({ ...prev, [index]: true })); // Set loading to true
  
    const formData = new FormData();
    formData.append('image', images[index]);
    formData.append('latitude', location.lat);
    formData.append('longitude', location.lng);
    if (newFileName) {
      formData.append('newFileName', newFileName.replace(/\s+/g, '-'));
    }
  
    try {
      const response = await axios.post('http://localhost:5001/add-geotag', formData, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      setConvertedImages((prev) => ({ ...prev, [index]: url }));
      setGeotagged((prev) => ({ ...prev, [index]: true }));
    } catch (error) {
      console.error('Error adding geotag:', error);
    } finally {
      setLoading((prev) => ({ ...prev, [index]: false })); // Set loading to false
    }
  };

  const handleClear = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setConvertedImages((prev) => {
      const newConvertedImages = { ...prev };
      delete newConvertedImages[index];
      return newConvertedImages;
    });
    setGeotagged((prev) => {
      const newGeotagged = { ...prev };
      delete newGeotagged[index];
      return newGeotagged;
    });
  };

  const handleClearAll = () => {
    setImages([]);
    setConvertedImages({});
    setGeotagged({});
  };

  const getWebpFileName = (originalName, newFileName) => {
    if (newFileName) {
      const sanitizedFileName = newFileName.replace(/\s+/g, '-');
      return `${sanitizedFileName}.webp`;
    }
    const nameWithoutExtension = originalName.replace(/\.[^/.]+$/, "");
    return `${nameWithoutExtension}.webp`;
  };


  const handleDownloadAll = async () => {
    const zip = new JSZip();
    const folder = zip.folder("images");

    for (const [index, url] of Object.entries(convertedImages)) {
      const response = await fetch(url);
      const blob = await response.blob();
      folder.file(getWebpFileName(images[index].name, newFileName), blob);
    }

    zip.generateAsync({ type: "blob" }).then((content) => {
      saveAs(content, "images.zip");
    });
  };

  const allConvertedAndGeotagged = images.length > 0 && images.every((_, index) => geotagged[index]);

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-brand">WebTagger</div>
        <div className="navbar-links">
          <a href="#about" className="navbar-link">About</a>
          <button className="navbar-button login-button">Login</button>
          <button className="navbar-button signup-button">Sign Up</button>
        </div>
      </nav>
      <div className="top-container">
        <MapContainer center={[51.505, -0.09]} zoom={13} className="map-container">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker location={location} setLocation={setLocation} />
          <SearchControl setLocation={setLocation} />
        </MapContainer>
        <div
          className={`upload-container ${isDragActive ? 'active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <FaUpload className="upload-icon" /> {/* Yükleme simgesi */}
          <input type="file" multiple onChange={handleFileChange} className="upload-input" />
          <label className="upload-label">You can also drag and drop files here.</label>
        </div>
      </div>
      <ul className={`image-list ${images.length === 0 ? 'empty' : ''}`}>
      {images.map((image, index) => (
  <li key={index} className="image-item">
    <img src={URL.createObjectURL(image)} alt={image.name} className="image-preview" />
    <span className="image-name">{image.name}</span>
    <div className="button-group">
      <input
        type="text"
        placeholder="New File Name (optional)"
        value={newFileName}
        onChange={(e) => setNewFileName(e.target.value)}
        className="new-file-name-input"
      />
      {location && <button className="add-geotag-button" onClick={() => handleAddGeotag(index)}>Add Geotag</button>}
      {loading[index] && !geotagged[index] && <div className="loading-circle"></div>} {/* Add loading circle */}
      {geotagged[index] && (
        <>
          <a href={convertedImages[index]} download={getWebpFileName(image.name, newFileName)} className="ios-button">
            Download
          </a>
          <FaCheckCircle className="checkmark-icon" /> {/* Add checkmark icon */}
        </>
      )}
      <button className="clear-button" onClick={() => handleClear(index)}><FaTimes /></button>
    </div>
  </li>
))}
      </ul>
      {allConvertedAndGeotagged && (
        <div className="actions-container">
          <button className="ios-button" onClick={handleDownloadAll}>Download All</button>
          <button className="ios-button" onClick={handleClearAll}>Clear All</button>
        </div>
      )}
    </div>
  );
}

export default App;