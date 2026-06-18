const { validationResult } = require('express-validator');
const documentService = require('../services/documentService');
const notificationService = require('../services/notificationService');
const { deleteFileIfExists } = require('../utils/fileUtils');
const { getIO } = require('../socket/socket');
const AppError = require('../utils/AppError');

function handleValidationErrors(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors
      .array()
      .map((err) => err.msg)
      .join('. ');
    throw new AppError(message, 400);
  }
}

async function uploadDocument(req, res, next) {
  try {
    handleValidationErrors(req);

    const { title, description, student_id, class_id } = req.body;

    const document = await documentService.uploadDocument(req.user, {
      title,
      description,
      studentId: student_id,
      classId: class_id,
      file: req.file,
    });

    const io = getIO();
    await notificationService.notifyNewDocument(io, document, req.user.id);

    res.status(201).json({
      success: true,
      message: 'Documento subido correctamente',
      data: { document },
    });
  } catch (error) {
    if (req.file) {
      deleteFileIfExists(req.file.path);
    }
    next(error);
  }
}

async function getMyDocuments(req, res, next) {
  try {
    const documents = await documentService.getMyDocuments(req.user);

    res.status(200).json({
      success: true,
      data: { documents },
    });
  } catch (error) {
    next(error);
  }
}

async function getClassDocuments(req, res, next) {
  try {
    const documents = await documentService.getClassDocuments(
      req.params.classId,
      req.user
    );

    res.status(200).json({
      success: true,
      data: { documents },
    });
  } catch (error) {
    next(error);
  }
}

async function downloadDocument(req, res, next) {
  try {
    const document = await documentService.getDocumentForDownload(
      req.params.id,
      req.user
    );

    res.download(document.file_path, document.original_filename, (error) => {
      if (error) {
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
}

async function deleteDocument(req, res, next) {
  try {
    await documentService.deleteDocument(req.params.id, req.user);

    res.status(200).json({
      success: true,
      message: 'Documento eliminado correctamente',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadDocument,
  getMyDocuments,
  getClassDocuments,
  downloadDocument,
  deleteDocument,
};
