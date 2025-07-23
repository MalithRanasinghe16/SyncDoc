import express from "express";
import { body, validationResult, query } from "express-validator";
import Document from "../models/Document.js";
import Version from "../models/Version.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// @route   GET /api/documents
// @desc    Get all documents accessible by user
// @access  Private
router.get(
  "/",
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("search")
      .optional()
      .isString()
      .withMessage("Search must be a string"),
    query("folder")
      .optional()
      .isString()
      .withMessage("Folder must be a string"),
    query("status")
      .optional()
      .isIn(["draft", "published", "archived"])
      .withMessage("Invalid status"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
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
          { "collaborators.user": req.user._id },
          { "shareSettings.isPublic": true },
        ],
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
        .populate("ownerId", "name email avatar")
        .populate("collaborators.user", "name email avatar")
        .populate("lastEditedBy", "name email avatar")
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
          hasPrevPage: page > 1,
        },
      });
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({
        message: "Server error while fetching documents",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// @route   GET /api/documents/:id
// @desc    Get a specific document
// @access  Private
router.get("/:id", async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate("ownerId", "name email avatar")
      .populate("collaborators.user", "name email avatar")
      .populate("lastEditedBy", "name email avatar");

    if (!document) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    // Check if user has access
    if (!document.hasAccess(req.user._id)) {
      return res.status(403).json({
        message: "Access denied to this document",
      });
    }

    res.json(document);
  } catch (error) {
    console.error("Get document error:", error);
    res.status(500).json({
      message: "Server error while fetching document",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// @route   POST /api/documents
// @desc    Create a new document
// @access  Private
router.post(
  "/",
  [
    body("title")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Title cannot be more than 200 characters"),
    body("content")
      .optional()
      .isString()
      .withMessage("Content must be a string"),
    body("folder")
      .optional()
      .trim()
      .isString()
      .withMessage("Folder must be a string"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { title, content, folder } = req.body;

      const document = new Document({
        title: title || "Untitled Document",
        content: content || "",
        ownerId: req.user._id,
        lastEditedBy: req.user._id,
        folder: folder || "root",
      });

      await document.save();

      // Create initial version
      await Version.createVersion(
        document._id,
        document.content,
        document.title,
        req.user._id,
        req.user.name,
        "Document created"
      );

      // Populate the document before sending response
      await document.populate("ownerId", "name email avatar");

      res.status(201).json({
        message: "Document created successfully",
        document,
      });
    } catch (error) {
      console.error("Create document error:", error);
      res.status(500).json({
        message: "Server error while creating document",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// @route   PUT /api/documents/:id
// @desc    Update a document
// @access  Private
router.put(
  "/:id",
  [
    body("title")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Title cannot be more than 200 characters"),
    body("content")
      .optional()
      .isString()
      .withMessage("Content must be a string"),
    body("status")
      .optional()
      .isIn(["draft", "published", "archived"])
      .withMessage("Invalid status"),
    body("folder")
      .optional()
      .trim()
      .isString()
      .withMessage("Folder must be a string"),
    body("tags").optional().isArray().withMessage("Tags must be an array"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const document = await Document.findById(req.params.id);

      if (!document) {
        return res.status(404).json({
          message: "Document not found",
        });
      }

      // Check if user has write access
      if (!document.hasAccess(req.user._id, "write")) {
        return res.status(403).json({
          message: "You do not have permission to edit this document",
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
          "Content updated",
          true // Auto-save
        );
      }

      // Populate the document before sending response
      await document.populate([
        { path: "ownerId", select: "name email avatar" },
        { path: "collaborators.user", select: "name email avatar" },
        { path: "lastEditedBy", select: "name email avatar" },
      ]);

      res.json({
        message: "Document updated successfully",
        document,
      });
    } catch (error) {
      console.error("Update document error:", error);
      res.status(500).json({
        message: "Server error while updating document",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// @route   DELETE /api/documents/:id
// @desc    Delete a document
// @access  Private
router.delete("/:id", async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    // Only owner can delete
    if (document.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only the document owner can delete this document",
      });
    }

    // Delete all versions
    await Version.deleteMany({ documentId: document._id });

    // Delete document
    await Document.findByIdAndDelete(req.params.id);

    res.json({
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Delete document error:", error);
    res.status(500).json({
      message: "Server error while deleting document",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// @route   GET /api/documents/:id/versions
// @desc    Get version history for a document
// @access  Private
router.get(
  "/:id/versions",
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit must be between 1 and 50"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const document = await Document.findById(req.params.id);

      if (!document) {
        return res.status(404).json({
          message: "Document not found",
        });
      }

      // Check if user has access
      if (!document.hasAccess(req.user._id)) {
        return res.status(403).json({
          message: "Access denied to this document",
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const versions = await Version.getDocumentHistory(
        req.params.id,
        limit,
        skip
      );
      const total = await Version.countDocuments({ documentId: req.params.id });

      res.json({
        versions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalVersions: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      });
    } catch (error) {
      console.error("Get versions error:", error);
      res.status(500).json({
        message: "Server error while fetching versions",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/documents/:id/versions
// @desc    Create a new version (manual save)
// @access  Private
router.post(
  "/:id/versions",
  [
    body("changes")
      .optional()
      .trim()
      .isString()
      .withMessage("Changes description must be a string"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const document = await Document.findById(req.params.id);

      if (!document) {
        return res.status(404).json({
          message: "Document not found",
        });
      }

      // Check if user has write access
      if (!document.hasAccess(req.user._id, "write")) {
        return res.status(403).json({
          message:
            "You do not have permission to save versions of this document",
        });
      }

      const { changes } = req.body;

      const version = await Version.createVersion(
        document._id,
        document.content,
        document.title,
        req.user._id,
        req.user.name,
        changes || "Manual save",
        false // Not auto-save
      );

      await version.populate("authorId", "name email avatar");

      res.status(201).json({
        message: "Version saved successfully",
        version,
      });
    } catch (error) {
      console.error("Create version error:", error);
      res.status(500).json({
        message: "Server error while creating version",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/documents/:id/share
// @desc    Generate a shareable link for a document
// @access  Private
router.post(
  "/:id/share",
  [
    body("isPublic").isBoolean().withMessage("isPublic must be a boolean"),
    body("defaultPermission")
      .isIn(["read", "write", "comment"])
      .withMessage("Invalid permission level"),
    body("allowComments")
      .isBoolean()
      .withMessage("allowComments must be a boolean"),
    body("allowDownload")
      .isBoolean()
      .withMessage("allowDownload must be a boolean"),
    body("expiresAt")
      .optional()
      .isISO8601()
      .withMessage("expiresAt must be a valid date"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const document = await Document.findById(req.params.id);

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Check if user is owner or has write permission
      if (
        document.ownerId.toString() !== req.user._id.toString() &&
        !document.collaborators.some(
          (collab) =>
            collab.user.toString() === req.user._id.toString() &&
            collab.permission === "write"
        )
      ) {
        return res
          .status(403)
          .json({ message: "Not authorized to share this document" });
      }

      // Check if document already has a VALID share link for this permission level
      if (
        document.shareSettings?.permissionLinks?.[req.body.defaultPermission]
          ?.url &&
        document.shareSettings?.permissionLinks?.[req.body.defaultPermission]
          ?.token
      ) {
        const existingLink =
          document.shareSettings.permissionLinks[req.body.defaultPermission];
        return res.json({
          message: `Document already has a ${req.body.defaultPermission} share link`,
          shareUrl: existingLink.url,
          shareToken: existingLink.token,
          permission: req.body.defaultPermission,
          shareSettings: document.shareSettings,
        });
      }

      // Generate random share token for this permission level
      const shareToken = uuidv4().replace(/-/g, "").substring(0, 16);
      const shareUrl = `${
        process.env.FRONTEND_URL || "http://localhost:5173"
      }/shared/${shareToken}`;

      // Initialize shareSettings if it doesn't exist
      if (!document.shareSettings) {
        document.shareSettings = {
          isPublic: true,
          permissionLinks: {},
          defaultPermission: req.body.defaultPermission,
          allowComments: req.body.allowComments,
          allowDownload: req.body.allowDownload,
          createdAt: new Date(),
          createdBy: req.user._id,
        };
      }

      // Initialize permissionLinks if it doesn't exist
      if (!document.shareSettings.permissionLinks) {
        document.shareSettings.permissionLinks = {};
      }

      // Add the new permission link
      document.shareSettings.permissionLinks[req.body.defaultPermission] = {
        token: shareToken,
        url: shareUrl,
      };

      // Update other settings
      document.shareSettings.allowComments = req.body.allowComments;
      document.shareSettings.allowDownload = req.body.allowDownload;

      document.isShared = true;
      document.shareLink = shareUrl; // Keep for backward compatibility

      await document.save();

      res.json({
        message: "Share link generated successfully",
        shareUrl,
        shareToken,
        permission: req.body.defaultPermission,
        shareSettings: document.shareSettings,
      });
    } catch (error) {
      console.error("Generate share link error:", error);
      res.status(500).json({
        message: "Server error while generating share link",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// @route   PUT /api/documents/:id/share
// @desc    Update share settings for a document
// @access  Private
router.put(
  "/:id/share",
  [
    body("isPublic").isBoolean().withMessage("isPublic must be a boolean"),
    body("defaultPermission")
      .isIn(["read", "write", "comment"])
      .withMessage("Invalid permission level"),
    body("allowComments")
      .isBoolean()
      .withMessage("allowComments must be a boolean"),
    body("allowDownload")
      .isBoolean()
      .withMessage("allowDownload must be a boolean"),
    body("expiresAt")
      .optional()
      .isISO8601()
      .withMessage("expiresAt must be a valid date"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const document = await Document.findById(req.params.id);

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Check if user is owner or has write permission
      if (
        document.ownerId.toString() !== req.user._id.toString() &&
        !document.collaborators.some(
          (collab) =>
            collab.user.toString() === req.user._id.toString() &&
            collab.permission === "write"
        )
      ) {
        return res
          .status(403)
          .json({ message: "Not authorized to update share settings" });
      }

      if (!document.shareSettings) {
        return res.status(400).json({ message: "Document is not shared" });
      }

      // Update share settings
      document.shareSettings.isPublic = req.body.isPublic;
      document.shareSettings.defaultPermission = req.body.defaultPermission;
      document.shareSettings.allowComments = req.body.allowComments;
      document.shareSettings.allowDownload = req.body.allowDownload;
      if (req.body.expiresAt) {
        document.shareSettings.expiresAt = new Date(req.body.expiresAt);
      }

      await document.save();

      res.json({
        message: "Share settings updated successfully",
        shareSettings: document.shareSettings,
      });
    } catch (error) {
      console.error("Update share settings error:", error);
      res.status(500).json({
        message: "Server error while updating share settings",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// @route   DELETE /api/documents/:id/share
// @desc    Revoke share link for a document
// @access  Private
router.delete("/:id/share", async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Check if user is owner or has write permission
    if (
      document.ownerId.toString() !== req.user._id.toString() &&
      !document.collaborators.some(
        (collab) =>
          collab.user.toString() === req.user._id.toString() &&
          collab.permission === "write"
      )
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to revoke share link" });
    }

    // Remove share settings
    document.shareSettings = undefined;
    document.isShared = false;
    document.shareLink = undefined;

    await document.save();

    res.json({
      message: "Share link revoked successfully",
    });
  } catch (error) {
    console.error("Revoke share link error:", error);
    res.status(500).json({
      message: "Server error while revoking share link",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// @route   GET /api/documents/shared/:token
// @desc    Get document by share token
// @access  Private (requires authentication)
router.get("/shared/:token", async (req, res) => {
  try {
    // Note: This route now requires authentication (handled by middleware)
    // User must be logged in to access shared documents

    // Find document by checking all permission link tokens
    const document = await Document.findOne({
      $and: [
        { "shareSettings.isPublic": true },
        {
          $or: [
            { "shareSettings.permissionLinks.read.token": req.params.token },
            { "shareSettings.permissionLinks.comment.token": req.params.token },
            { "shareSettings.permissionLinks.write.token": req.params.token },
          ],
        },
      ],
    })
      .populate("ownerId", "name email avatar")
      .populate("collaborators.user", "name email avatar");

    if (!document) {
      return res
        .status(404)
        .json({ message: "Shared document not found or link expired" });
    }

    // Check if share link has expired
    if (
      document.shareSettings.expiresAt &&
      new Date() > new Date(document.shareSettings.expiresAt)
    ) {
      return res.status(410).json({ message: "Share link has expired" });
    }

    // Determine the permission level for this token
    let permission = "read";
    if (
      document.shareSettings.permissionLinks.write?.token === req.params.token
    ) {
      permission = "write";
    } else if (
      document.shareSettings.permissionLinks.comment?.token === req.params.token
    ) {
      permission = "comment";
    }

    // Return document with share settings and permission
    res.json({
      document: {
        id: document._id,
        title: document.title,
        content: document.content,
        ownerId: document.ownerId,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        shareSettings: {
          ...document.shareSettings.toObject(),
          accessPermission: permission, // The specific permission for this token
        },
      },
    });
  } catch (error) {
    console.error("Get shared document error:", error);
    res.status(500).json({
      message: "Server error while fetching shared document",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

export default router;
