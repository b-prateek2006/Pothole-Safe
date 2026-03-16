const express = require('express');
const path = require('path');
const router = express.Router();
const { UPLOAD_DIR } = require('../services/fileStorageService');

// GET /api/files/:filename — serve uploaded images
router.get('/:filename', (req, res) => {
  const filename = path.basename(req.params.filename); // prevent path traversal
  const filePath = path.join(UPLOAD_DIR, filename);

  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ error: 'File not found' });
    }
  });
});

module.exports = router;
