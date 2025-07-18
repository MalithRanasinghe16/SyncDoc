import express from 'express';
import { body, validationResult, query } from 'express-validator';
import Document from '../models/Document.js';
import Version from '../models/Version.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// @route   GET /api/documents
// @desc    Get all documents accessible by user
// @access  Private
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('folder').optional().isString().withMessage('Folder must be a string'),
  query('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { search, folder, status } = req.query;

    // Build query
    let query = {
      $or: [
        { ownerId: req.user._id },
        { 'collaborators.user': req.user._id },
        { 'shareSettings.isPublic': true }
      ]
    };

    if (search) {
      query.$text = { $search: search };
    }

    if (folder) {
      query.folder = folder;
    }

    if (status) {
      query.status = status;
    }

    const documents = await Document.find(query)
      .populate('ownerId', 'name email avatar')
      .populate('collaborators.user', 'name email avatar')
      .populate('lastEditedBy', 'name email avatar')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Document.countDocuments(query);

    res.json({
      documents,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalDocuments: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      message: 'Server error while fetching documents',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/documents/:id
// @desc    Get a specific document
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('ownerId', 'name email avatar')
      .populate('collaborators.user', 'name email avatar')
      .populate('lastEditedBy', 'name email avatar');

    if (!document) {
      return res.status(404).json({
        message: 'Document not found'
      });
    }

    // Check if user has access
    if (!document.hasAccess(req.user._id)) {
      return res.status(403).json({
        message: 'Access denied to this document'
      });
    }

    res.json(document);

  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      message: 'Server error while fetching document',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/documents
// @desc    Create a new document
// @access  Private
router.post('/', [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title cannot be more than 200 characters'),
  body('content')
    .optional()
    .isString()
    .withMessage('Content must be a string'),
  body('folder')
    .optional()
    .trim()
    .isString()
    .withMessage('Folder must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, content, folder } = req.body;

    const document = new Document({
      title: title || 'Untitled Document',
      content: content || '',
      ownerId: req.user._id,
      lastEditedBy: req.user._id,
      folder: folder || 'root'
    });

    await document.save();

    // Create initial version
    await Version.createVersion(
      document._id,
      document.content,
      document.title,
      req.user._id,
      req.user.name,
      'Document created'
    );

    // Populate the document before sending response
    await document.populate('ownerId', 'name email avatar');

    res.status(201).json({
      message: 'Document created successfully',
      document
    });

  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({
      message: 'Server error while creating document',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/documents/:id
// @desc    Update a document
// @access  Private
router.put('/:id', [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title cannot be more than 200 characters'),
  body('content')
    .optional()
    .isString()
    .withMessage('Content must be a string'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Invalid status'),
  body('folder')
    .optional()
    .trim()
    .isString()
    .withMessage('Folder must be a string'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        message: 'Document not found'
      });
    }

    // Check if user has write access
    if (!document.hasAccess(req.user._id, 'write')) {
      return res.status(403).json({
        message: 'You do not have permission to edit this document'
      });
    }

    const { title, content, status, folder, tags } = req.body;
    const oldContent = document.content;

    // Update document
    if (title !== undefined) document.title = title;
    if (content !== undefined) document.content = content;
    if (status !== undefined) document.status = status;
    if (folder !== undefined) document.folder = folder;
    if (tags !== undefined) document.tags = tags;
    
    document.lastEditedBy = req.user._id;

    await document.save();

    // Create version if content changed significantly
    if (content !== undefined && content !== oldContent) {
      await Version.createVersion(
        document._id,
        document.content,
        document.title,
        req.user._id,
        req.user.name,
        'Content updated',
        true // Auto-save
      );
    }

    // Populate the document before sending response
    await document.populate([
      { path: 'ownerId', select: 'name email avatar' },
      { path: 'collaborators.user', select: 'name email avatar' },
      { path: 'lastEditedBy', select: 'name email avatar' }
    ]);

    res.json({
      message: 'Document updated successfully',
      document
    });

  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      message: 'Server error while updating document',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   DELETE /api/documents/:id
// @desc    Delete a document
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        message: 'Document not found'
      });
    }

    // Only owner can delete
    if (document.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Only the document owner can delete this document'
      });
    }

    // Delete all versions
    await Version.deleteMany({ documentId: document._id });

    // Delete document
    await Document.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      message: 'Server error while deleting document',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/documents/:id/versions
// @desc    Get version history for a document
// @access  Private
router.get('/:id/versions', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        message: 'Document not found'
      });
    }

    // Check if user has access
    if (!document.hasAccess(req.user._id)) {
      return res.status(403).json({
        message: 'Access denied to this document'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const versions = await Version.getDocumentHistory(req.params.id, limit, skip);
    const total = await Version.countDocuments({ documentId: req.params.id });

    res.json({
      versions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalVersions: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get versions error:', error);
    res.status(500).json({
      message: 'Server error while fetching versions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/documents/:id/versions
// @desc    Create a new version (manual save)
// @access  Private
router.post('/:id/versions', [
  body('changes')
    .optional()
    .trim()
    .isString()
    .withMessage('Changes description must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        message: 'Document not found'
      });
    }

    // Check if user has write access
    if (!document.hasAccess(req.user._id, 'write')) {
      return res.status(403).json({
        message: 'You do not have permission to save versions of this document'
      });
    }

    const { changes } = req.body;

    const version = await Version.createVersion(
      document._id,
      document.content,
      document.title,
      req.user._id,
      req.user.name,
      changes || 'Manual save',
      false // Not auto-save
    );

    await version.populate('authorId', 'name email avatar');

    res.status(201).json({
      message: 'Version saved successfully',
      version
    });

  } catch (error) {
    console.error('Create version error:', error);
    res.status(500).json({
      message: 'Server error while creating version',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
