const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const AppError = require('../utils/AppError');
const {
  getAssignmentAttachmentUploadPath,
  ensureDirectoryExists,
} = require('../utils/fileUtils');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.txt',
]);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

const uploadDir = getAssignmentAttachmentUploadPath();
ensureDirectoryExists(uploadDir);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    ensureDirectoryExists(uploadDir);
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`;
    cb(null, uniqueName);
  },
});

function fileFilter(req, file, cb) {
  const extension = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return cb(
      new AppError(
        'Tipo de archivo no permitido. Formatos válidos: PDF, imágenes, Word, PowerPoint, Excel y TXT',
        400
      )
    );
  }

  if (file.mimetype && !ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(
      new AppError(
        'Tipo MIME no permitido. Formatos válidos: PDF, imágenes, Word, PowerPoint, Excel y TXT',
        400
      )
    );
  }

  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

function handleAttachmentUpload(req, res, next) {
  upload.single('attachment')(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('El archivo adjunto no puede superar los 10 MB', 400));
      }
      return next(new AppError(error.message, 400));
    }

    if (error) {
      return next(error);
    }

    next();
  });
}

function optionalAttachmentUpload(req, res, next) {
  const contentType = req.headers['content-type'] || '';

  if (contentType.includes('multipart/form-data')) {
    return handleAttachmentUpload(req, res, next);
  }

  next();
}

module.exports = {
  handleAttachmentUpload,
  optionalAttachmentUpload,
};
