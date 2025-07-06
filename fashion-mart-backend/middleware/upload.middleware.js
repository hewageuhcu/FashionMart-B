const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'misc';
    
    // Determine the folder based on the file type
    if (file.fieldname === 'productImages') {
      folder = 'products';
    } else if (file.fieldname === 'designImages') {
      folder = 'designs';
    } else if (file.fieldname === 'billImages') {
      folder = 'bills';
    } else if (file.fieldname === 'returnImages') {
      folder = 'returns';
    } else if (file.fieldname === 'profileImage') {
      folder = 'profiles';
    }
    
    const targetDir = path.join(uploadDir, folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    // Create a unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Sanitize filename to prevent directory traversal
    const sanitizedName = file.fieldname.replace(/[^a-zA-Z0-9]/g, '');
    
    cb(null, sanitizedName + '-' + uniqueSuffix + ext);
  }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  // Additional security: check for double extensions
  const fileName = file.originalname.toLowerCase();
  const suspiciousExtensions = /\.(php|js|html|exe|bat|sh|py|pl|jsp|asp|aspx)$/;
  
  if (suspiciousExtensions.test(fileName)) {
    return cb(new Error('File type not allowed - suspicious extension detected'));
  }
  
  if (ext && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed!'));
  }
};

// Create multer upload object
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB file size limit
  }
});

module.exports = {
  upload
};