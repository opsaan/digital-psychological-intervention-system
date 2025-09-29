const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

const STORAGE_DIR = process.env.STORAGE_DIR || './storage';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Ensure storage directory exists
const ensureStorageDir = async () => {
  try {
    await fs.access(STORAGE_DIR);
  } catch {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  }
};

// File filter for different resource types
const createFileFilter = (allowedTypes = []) => {
  return (req, file, cb) => {
    const allowedMimeTypes = {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'],
      video: ['video/mp4', 'video/webm', 'video/ogg'],
      document: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    };
    
    const allowed = allowedTypes.length > 0 
      ? allowedTypes.flatMap(type => allowedMimeTypes[type] || [])
      : Object.values(allowedMimeTypes).flat();
    
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowed.join(', ')}`), false);
    }
  };
};

// Storage configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureStorageDir();
    cb(null, STORAGE_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueName}${ext}`);
  }
});

// Create upload middleware
const createUpload = (options = {}) => {
  const {
    fieldName = 'file',
    allowedTypes = [],
    maxFileSize = MAX_FILE_SIZE
  } = options;
  
  return multer({
    storage,
    limits: {
      fileSize: maxFileSize
    },
    fileFilter: createFileFilter(allowedTypes)
  }).single(fieldName);
};

// Predefined upload configurations
const uploadResource = createUpload({
  fieldName: 'file',
  allowedTypes: ['audio', 'video', 'document'],
  maxFileSize: 50 * 1024 * 1024 // 50MB for resources
});

const uploadAvatar = createUpload({
  fieldName: 'avatar',
  allowedTypes: ['image'],
  maxFileSize: 5 * 1024 * 1024 // 5MB for avatars
});

// File deletion helper
const deleteFile = async (filePath) => {
  try {
    const fullPath = path.join(STORAGE_DIR, path.basename(filePath));
    await fs.unlink(fullPath);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// File serving helper
const serveFile = (req, res, next) => {
  const fileName = req.params.fileName;
  const filePath = path.join(STORAGE_DIR, fileName);
  
  // Security: prevent directory traversal
  if (!filePath.startsWith(path.resolve(STORAGE_DIR))) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  res.sendFile(path.resolve(filePath), (err) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ error: 'File not found' });
      }
      return res.status(500).json({ error: 'Error serving file' });
    }
  });
};

module.exports = {
  createUpload,
  uploadResource,
  uploadAvatar,
  deleteFile,
  serveFile,
  ensureStorageDir
};
