const fs = require('fs');
const path = require('path');

function getUploadPath() {
  return path.join(process.cwd(), 'uploads', 'documents');
}

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function deleteFileIfExists(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('No se pudo eliminar el archivo físico:', filePath, error.message);
  }
}

module.exports = {
  getUploadPath,
  ensureDirectoryExists,
  deleteFileIfExists,
};
