const { validationResult } = require('express-validator');
const assignmentService = require('../services/assignmentService');
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

async function createAssignment(req, res, next) {
  try {
    handleValidationErrors(req);
    const { title, description, student_id, class_id, due_date } = req.body;

    const assignment = await assignmentService.createAssignment(req.user, {
      title,
      description,
      studentId: student_id,
      classId: class_id,
      dueDate: due_date,
    });

    const io = getIO();
    await notificationService.notifyNewAssignment(io, assignment);

    res.status(201).json({
      success: true,
      message: 'Tarea creada correctamente',
      data: { assignment },
    });
  } catch (error) {
    next(error);
  }
}

async function getAssignments(req, res, next) {
  try {
    const assignments = await assignmentService.getMyAssignments(req.user);

    res.status(200).json({
      success: true,
      data: { assignments },
    });
  } catch (error) {
    next(error);
  }
}

async function getAssignmentById(req, res, next) {
  try {
    const assignment = await assignmentService.getAssignmentById(req.params.id, req.user);

    res.status(200).json({
      success: true,
      data: { assignment },
    });
  } catch (error) {
    next(error);
  }
}

async function updateAssignment(req, res, next) {
  try {
    handleValidationErrors(req);
    const { title, description, due_date, status } = req.body;

    const assignment = await assignmentService.updateAssignment(req.params.id, req.user, {
      title,
      description,
      dueDate: due_date,
      status,
    });

    res.status(200).json({
      success: true,
      message: 'Tarea actualizada correctamente',
      data: { assignment },
    });
  } catch (error) {
    next(error);
  }
}

async function submitAssignment(req, res, next) {
  try {
    handleValidationErrors(req);

    const assignment = await assignmentService.submitAssignment(req.params.id, req.user, {
      submissionText: req.body.submission_text,
      file: req.file,
    });

    const io = getIO();
    await notificationService.notifyAssignmentSubmitted(io, assignment);

    res.status(200).json({
      success: true,
      message: 'Tarea entregada correctamente',
      data: { assignment },
    });
  } catch (error) {
    if (req.file) {
      deleteFileIfExists(req.file.path);
    }
    next(error);
  }
}

async function reviewAssignment(req, res, next) {
  try {
    handleValidationErrors(req);

    const assignment = await assignmentService.reviewAssignment(req.params.id, req.user, {
      teacherFeedback: req.body.teacher_feedback,
    });

    const io = getIO();
    await notificationService.notifyAssignmentReviewed(io, assignment);

    res.status(200).json({
      success: true,
      message: 'Tarea revisada correctamente',
      data: { assignment },
    });
  } catch (error) {
    next(error);
  }
}

async function deleteAssignment(req, res, next) {
  try {
    await assignmentService.deleteAssignment(req.params.id, req.user);

    res.status(200).json({
      success: true,
      message: 'Tarea eliminada correctamente',
    });
  } catch (error) {
    next(error);
  }
}

async function downloadSubmissionFile(req, res, next) {
  try {
    const assignment = await assignmentService.getSubmissionFile(req.params.id, req.user);

    res.download(
      assignment.submission_file_path,
      assignment.submission_original_filename,
      (error) => {
        if (error) {
          next(error);
        }
      }
    );
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createAssignment,
  getAssignments,
  getAssignmentById,
  updateAssignment,
  submitAssignment,
  reviewAssignment,
  deleteAssignment,
  downloadSubmissionFile,
};
