import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Document title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters'],
    default: 'Untitled Document'
  },
  content: {
    type: String,
    default: ''
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Document must have an owner']
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['read', 'write', 'admin'],
      default: 'write'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isShared: {
    type: Boolean,
    default: false
  },
  shareSettings: {
    isPublic: {
      type: Boolean,
      default: false
    },
    allowComments: {
      type: Boolean,
      default: true
    },
    allowDownload: {
      type: Boolean,
      default: true
    },
    shareLink: {
      type: String,
      unique: true,
      sparse: true
    },
    expiresAt: {
      type: Date
    }
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot be more than 30 characters']
  }],
  folder: {
    type: String,
    default: 'root',
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  wordCount: {
    type: Number,
    default: 0
  },
  characterCount: {
    type: Number,
    default: 0
  },
  lastEditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
documentSchema.index({ ownerId: 1 });
documentSchema.index({ 'collaborators.user': 1 });
documentSchema.index({ title: 'text', content: 'text' }); // Text search
documentSchema.index({ createdAt: -1 });
documentSchema.index({ updatedAt: -1 });
// shareSettings.shareLink already indexed due to unique: true, sparse: true

// Pre-save middleware to update word and character counts
documentSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    // Remove HTML tags and count words
    const textContent = this.content.replace(/<[^>]*>/g, '').trim();
    this.wordCount = textContent ? textContent.split(/\s+/).length : 0;
    this.characterCount = textContent.length;
  }
  
  this.updatedAt = new Date();
  next();
});

// Instance method to check if user has access
documentSchema.methods.hasAccess = function(userId, requiredPermission = 'read') {
  const userIdString = userId.toString();
  
  // Owner has all permissions
  if (this.ownerId.toString() === userIdString) {
    return true;
  }
  
  // Check collaborators
  const collaborator = this.collaborators.find(
    collab => collab.user.toString() === userIdString
  );
  
  if (!collaborator) {
    return this.shareSettings.isPublic && requiredPermission === 'read';
  }
  
  // Permission hierarchy: admin > write > read
  const permissions = { 'read': 1, 'write': 2, 'admin': 3 };
  const userPermLevel = permissions[collaborator.permission] || 0;
  const requiredPermLevel = permissions[requiredPermission] || 0;
  
  return userPermLevel >= requiredPermLevel;
};

// Instance method to add collaborator
documentSchema.methods.addCollaborator = function(userId, permission = 'write') {
  const userIdString = userId.toString();
  
  // Check if user is already a collaborator
  const existingIndex = this.collaborators.findIndex(
    collab => collab.user.toString() === userIdString
  );
  
  if (existingIndex !== -1) {
    // Update existing collaborator permission
    this.collaborators[existingIndex].permission = permission;
  } else {
    // Add new collaborator
    this.collaborators.push({
      user: userId,
      permission: permission
    });
  }
  
  this.isShared = true;
  return this.save();
};

// Instance method to remove collaborator
documentSchema.methods.removeCollaborator = function(userId) {
  this.collaborators = this.collaborators.filter(
    collab => collab.user.toString() !== userId.toString()
  );
  
  // If no collaborators left, set isShared to false
  if (this.collaborators.length === 0) {
    this.isShared = false;
  }
  
  return this.save();
};

// Static method to find documents accessible by user
documentSchema.statics.findAccessibleByUser = function(userId) {
  return this.find({
    $or: [
      { ownerId: userId },
      { 'collaborators.user': userId },
      { 'shareSettings.isPublic': true }
    ]
  }).populate('ownerId', 'name email avatar')
    .populate('collaborators.user', 'name email avatar')
    .populate('lastEditedBy', 'name email avatar');
};

// Virtual for getting all users with access (owner + collaborators)
documentSchema.virtual('allUsers').get(function() {
  const users = [this.ownerId];
  this.collaborators.forEach(collab => {
    users.push(collab.user);
  });
  return users;
});

// Ensure virtual fields are serialized
documentSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Document = mongoose.model('Document', documentSchema);

export default Document;
