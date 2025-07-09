import mongoose from 'mongoose';

const versionSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: [true, 'Version must be associated with a document']
  },
  content: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    required: [true, 'Version title is required']
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Version must have an author']
  },
  authorName: {
    type: String,
    required: true
  },
  changes: {
    type: String,
    default: ''
  },
  changesSummary: {
    added: { type: Number, default: 0 },
    removed: { type: Number, default: 0 },
    modified: { type: Number, default: 0 }
  },
  wordCount: {
    type: Number,
    default: 0
  },
  characterCount: {
    type: Number,
    default: 0
  },
  versionNumber: {
    type: Number,
    required: true
  },
  isAutoSave: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: true, updatedAt: false } // Only track creation time
});

// Indexes for better query performance
versionSchema.index({ documentId: 1, createdAt: -1 });
versionSchema.index({ authorId: 1 });
versionSchema.index({ versionNumber: 1 });

// Pre-save middleware to calculate word and character counts
versionSchema.pre('save', function(next) {
  // Remove HTML tags and count words
  const textContent = this.content.replace(/<[^>]*>/g, '').trim();
  this.wordCount = textContent ? textContent.split(/\s+/).length : 0;
  this.characterCount = textContent.length;
  next();
});

// Static method to get next version number for a document
versionSchema.statics.getNextVersionNumber = async function(documentId) {
  const lastVersion = await this.findOne({ documentId })
    .sort({ versionNumber: -1 })
    .select('versionNumber');
  
  return lastVersion ? lastVersion.versionNumber + 1 : 1;
};

// Static method to create a new version
versionSchema.statics.createVersion = async function(documentId, content, title, authorId, authorName, changes = '', isAutoSave = false) {
  const versionNumber = await this.getNextVersionNumber(documentId);
  
  const version = new this({
    documentId,
    content,
    title,
    authorId,
    authorName,
    changes,
    versionNumber,
    isAutoSave
  });
  
  return await version.save();
};

// Static method to get version history for a document
versionSchema.statics.getDocumentHistory = function(documentId, limit = 50, skip = 0) {
  return this.find({ documentId })
    .populate('authorId', 'name email avatar')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Instance method to compare with another version
versionSchema.methods.compareWith = function(otherVersion) {
  // Simple word-based comparison
  const thisWords = this.content.replace(/<[^>]*>/g, '').split(/\s+/);
  const otherWords = otherVersion.content.replace(/<[^>]*>/g, '').split(/\s+/);
  
  return {
    currentVersion: this.versionNumber,
    comparedVersion: otherVersion.versionNumber,
    wordDifference: thisWords.length - otherWords.length,
    characterDifference: this.characterCount - otherVersion.characterCount,
    timeDifference: this.createdAt - otherVersion.createdAt
  };
};

// Virtual for getting version age
versionSchema.virtual('age').get(function() {
  const now = new Date();
  const diffMs = now - this.createdAt;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
});

// Ensure virtual fields are serialized
versionSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Version = mongoose.model('Version', versionSchema);

export default Version;
