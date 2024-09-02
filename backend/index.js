const path = require('path');
const cors = require('cors');
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const exiftool = require('exiftool-vendored').exiftool;

const app = express();
const upload = multer();

app.use(cors());
app.use(express.json()); // JSON verilerini işlemek için gerekli

// Function to schedule file deletion
const scheduleFileDeletion = (filePath, timeout = 5 * 60 * 1000) => {
  setTimeout(() => {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Failed to delete file: ${filePath}`, err);
      } else {
        console.log(`File deleted: ${filePath}`);
      }
    });
  }, timeout);
};

app.post('/convert', upload.single('image'), async (req, res) => {
  try {
    const webpBuffer = await sharp(req.file.buffer).webp().toBuffer();
    res.set('Content-Type', 'image/webp');
    res.send(webpBuffer);
  } catch (error) {
    console.error('Error converting image:', error);
    res.status(500).send('Error converting image');
  }
});

app.post('/add-geotag', upload.single('image'), async (req, res) => {
  const { latitude, longitude, newFileName } = req.body;
  console.log('Received geotag data:', { latitude, longitude, newFileName });
  try {
    const webpBuffer = await sharp(req.file.buffer).webp().toBuffer();
    const tempFilePath = path.join(__dirname, `temp-${Date.now()}.webp`);

    // Save the buffer to a temporary file
    await fs.promises.writeFile(tempFilePath, webpBuffer);

    // Schedule file deletion within 5 minutes
    scheduleFileDeletion(tempFilePath);

    // Add EXIF metadata
    await exiftool.write(tempFilePath, {
      GPSLatitude: latitude,
      GPSLongitude: longitude,
      GPSLatitudeRef: latitude >= 0 ? 'N' : 'S',
      GPSLongitudeRef: longitude >= 0 ? 'E' : 'W',
    });

    res.send('Geotag added successfully');
  } catch (error) {
    console.error('Error adding geotag:', error);
    res.status(500).send('Error adding geotag');
  }
});

app.post('/download', async (req, res) => {
  const { filePath } = req.body;
  console.log('Download requested for file:', filePath);

  // Schedule file deletion within 5 minutes
  scheduleFileDeletion(filePath);

  res.download(filePath, (err) => {
    if (err) {
      console.error('Error downloading file:', err);
      res.status(500).send('Error downloading file');
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});