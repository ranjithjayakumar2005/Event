const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cloudinary = require('cloudinary').v2;

// Helper to get a guaranteed writable uploads directory (uses os.tmpdir() on Vercel / Serverless read-only environments)
function getUploadDir(subfolder = '') {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION);
  let targetDir = path.join(__dirname, '../uploads', subfolder);

  if (isServerless) {
    targetDir = path.join(os.tmpdir(), 'uploads', subfolder);
  } else {
    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      // Test writability
      const testFile = path.join(targetDir, `.writable_test_${Date.now()}`);
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
    } catch (err) {
      targetDir = path.join(os.tmpdir(), 'uploads', subfolder);
    }
  }

  if (!fs.existsSync(targetDir)) {
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch (err) {
      console.warn(`[Upload Dir Warning] Could not create ${targetDir}:`, err.message);
    }
  }

  return targetDir;
}

// Check and dynamically configure Cloudinary via environment variables
const ensureCloudinaryConfigured = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret
    });
    return true;
  }
  return false;
};

// Storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'pptFile') {
      cb(null, getUploadDir('ppt'));
    } else if (file.fieldname === 'eurekaScreenshot') {
      cb(null, getUploadDir('screenshots'));
    } else {
      cb(new Error('Invalid field name for file upload'));
    }
  },
  filename: function (req, file, cb) {
    const rawName = (req.body && (req.body.teamName || req.body.startupName)) ? (req.body.teamName || req.body.startupName) : file.fieldname;
    const cleanName = rawName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${cleanName}_${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (file.fieldname === 'pptFile') {
    const allowedExtensions = ['.ppt', '.pptx'];
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .ppt and .pptx files are allowed for PPT upload!'), false);
    }
  } else if (file.fieldname === 'eurekaScreenshot') {
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.pdf'];
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .png, .jpg, .jpeg, and .pdf files are allowed for Eureka Screenshot!'), false);
    }
  } else {
    cb(new Error('Unexpected file field'), false);
  }
};

// Multer upload instances
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit max for multer stream
  }
});

// Specific fields middleware
const uploadTeamFiles = upload.fields([
  { name: 'pptFile', maxCount: 1 },
  { name: 'eurekaScreenshot', maxCount: 1 }
]);

/**
 * Validate binary file magic signatures to prevent executable/script uploads renamed to .png or .pptx
 */
function validateMagicBytes(filePath, fieldname) {
  try {
    const buffer = Buffer.alloc(8);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    if (fieldname === 'eurekaScreenshot') {
      // PNG: 89 50 4E 47
      const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
      // JPG/JPEG: FF D8 FF
      const isJpg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
      // PDF: %PDF (25 50 44 46)
      const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;

      return isPng || isJpg || isPdf;
    }

    if (fieldname === 'pptFile') {
      // Office Open XML (.pptx) ZIP container: PK\x03\x04 (50 4B 03 04)
      const isPptxZip = buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
      // Legacy PPT (Compound File Binary): D0 CF 11 E0 A1 B1 1A E1
      const isLegacyPpt = buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0;

      return isPptxZip || isLegacyPpt;
    }

    return false;
  } catch (err) {
    console.error(`[Magic Byte Error] Failed reading ${filePath}:`, err.message);
    return false;
  }
}

// Wrapper middleware to handle size limits per field cleanly + optional Cloudinary CDN upload
const uploadMiddleware = (req, res, next) => {
  uploadTeamFiles(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File size exceeds maximum limit (PPT: max 10MB, Screenshot: max 5MB).' });
      }
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    // Secondary file size verification per specific field & binary magic signature check
    if (req.files) {
      if (req.files.eurekaScreenshot && req.files.eurekaScreenshot[0].size > 5 * 1024 * 1024) {
        return res.status(400).json({ success: false, message: 'Eureka Screenshot exceeds 5MB size limit!' });
      }
      if (req.files.pptFile && req.files.pptFile[0].size > 10 * 1024 * 1024) {
        return res.status(400).json({ success: false, message: 'Presentation PPT file exceeds 10MB size limit!' });
      }

      // Binary Header Signature Validation
      for (const field of ['pptFile', 'eurekaScreenshot']) {
        if (req.files[field] && req.files[field][0]) {
          const file = req.files[field][0];
          if (!validateMagicBytes(file.path, field)) {
            fs.unlink(file.path, () => {});
            return res.status(400).json({
              success: false,
              message: `Security Rejection: Binary header signature of uploaded file (${field}) does not match valid ${field === 'pptFile' ? '.ppt/.pptx' : '.png/.jpg/.pdf'} format!`
            });
          }
        }
      }

      // Extract sanitized Team Name for Cloudinary public_id
      const rawTeamName = (req.body && (req.body.teamName || req.body.startupName)) ? (req.body.teamName || req.body.startupName) : 'team';
      const sanitizedTeamName = rawTeamName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');

      // If Cloudinary credentials are set in environment variables, upload to Cloudinary CDN in parallel
      if (ensureCloudinaryConfigured()) {
        try {
          const uploadPromises = [];

          if (req.files.eurekaScreenshot && req.files.eurekaScreenshot[0]) {
            const file = req.files.eurekaScreenshot[0];
            const screenshotPublicId = `${sanitizedTeamName}_Proof_${Date.now()}`;

            uploadPromises.push(
              cloudinary.uploader.upload(file.path, {
                folder: 'pitch_competition/screenshots',
                public_id: screenshotPublicId,
                resource_type: 'auto'
              }).then(result => {
                file.cloudinaryUrl = result.secure_url;
                fs.unlink(file.path, () => {});
              })
            );
          }

          if (req.files.pptFile && req.files.pptFile[0]) {
            const file = req.files.pptFile[0];
            const ext = path.extname(file.originalname).toLowerCase();
            const pptPublicId = `${sanitizedTeamName}_Pitch_${Date.now()}${ext}`;

            uploadPromises.push(
              cloudinary.uploader.upload(file.path, {
                folder: 'pitch_competition/ppt',
                public_id: pptPublicId,
                resource_type: 'raw' // 'raw' preserves .ppt/.pptx extension & binary structure
              }).then(result => {
                file.cloudinaryUrl = result.secure_url;
                fs.unlink(file.path, () => {});
              })
            );
          }

          await Promise.all(uploadPromises);
        } catch (cloudErr) {
          console.warn('[Cloudinary Warning] Cloud upload failed, using local disk copy:', cloudErr.message);
        }
      }
    }
    next();
  });
};

module.exports = uploadMiddleware;
