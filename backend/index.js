const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const { exiftool } = require('exiftool-vendored');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer();

app.use(cors());
app.use(express.json()); // JSON verilerini işlemek için gerekli

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
  const { latitude, longitude } = req.body;
  console.log('Received geotag data:', { latitude, longitude });
  try {
    const webpBuffer = await sharp(req.file.buffer).webp().toBuffer();
    const tempFilePath = path.join(__dirname, `temp-${Date.now()}.webp`);

    // Save the buffer to a temporary file
    await fs.promises.writeFile(tempFilePath, webpBuffer);

    // Add EXIF metadata
    await exiftool.write(tempFilePath, {
      GPSLatitude: latitude,
      GPSLongitude: longitude,
      GPSLatitudeRef: latitude >= 0 ? 'N' : 'S',
      GPSLongitudeRef: longitude >= 0 ? 'E' : 'W',
    });

    // Read the file back into a buffer
    const taggedBuffer = await fs.promises.readFile(tempFilePath);

    // Clean up the temporary file
    await fs.promises.unlink(tempFilePath);

    res.set('Content-Type', 'image/webp');
    res.send(taggedBuffer);
  } catch (error) {
    console.error('Error adding geotag:', error);
    res.status(500).send('Error adding geotag');
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});