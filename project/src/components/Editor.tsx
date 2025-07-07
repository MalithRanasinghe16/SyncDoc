import React, { useState, useRef, useEffect } from 'react';
import { useDocuments } from '../contexts/DocumentContext';
import { 
  ArrowLeft, 
  Share2, 
  History, 
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Save,
  Download,
  Eye,
  EyeOff,
  Palette,
  Link,
  Image,
  Plus,
  Quote,
  Maximize2,
  Minimize2,
  FileText
} from 'lucide-react';
import { Document } from '../types';

interface EditorProps {
  document: Document;
  onBack: () => void;
  onShowVersions: () => void;
}

export default function Editor({ document, onBack, onShowVersions }: EditorProps) {
  const { updateDocument, saveVersion } = useDocuments();
  const [content, setContent] = useState(document.content);
  const [title, setTitle] = useState(document.title);
  const [isPreview, setIsPreview] = useState(false);
  const [showFormatting, setShowFormatting] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<number>();

  // Auto-save functionality
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = window.setTimeout(() => {
      if (content !== document.content || title !== document.title) {
        updateDocument(document.id, { content, title });
        saveVersion(document.id, content);
        setLastSaved(new Date());
        setIsTyping(false);
      }
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, title, document.id, document.content, document.title, updateDocument, saveVersion]);

  // Word count effect
  useEffect(() => {
    const textContent = content.replace(/<[^>]*>/g, '').trim();
    const words = textContent ? textContent.split(/\s+/).length : 0;
    setWordCount(words);
  }, [content]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault();
            formatText('bold');
            break;
          case 'i':
            e.preventDefault();
            formatText('italic');
            break;
          case 'u':
            e.preventDefault();
            formatText('underline');
            break;
          case 's':
            e.preventDefault();
            saveNow();
            break;
          case 'Enter':
            if (e.shiftKey) {
              e.preventDefault();
              setIsFullscreen(!isFullscreen);
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Set initial content when component mounts or document changes
  useEffect(() => {
    if (editorRef.current) {
      if (document.content && document.content.trim() !== '') {
        editorRef.current.innerHTML = document.content;
        setShowPlaceholder(false);
      } else {
        editorRef.current.innerHTML = '';
        setShowPlaceholder(true);
      }
    }
  }, [document.content]);

  const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.innerHTML;
    
    // Clean up empty paragraph tags that browsers sometimes add
    const cleanContent = newContent === '<p><br></p>' || newContent === '<br>' ? '' : newContent;
    
    setContent(cleanContent);
    setIsTyping(true);
    setShowPlaceholder(cleanContent.trim() === '');
  };

  const handleFocus = () => {
    if (editorRef.current && (!content || content.trim() === '')) {
      editorRef.current.innerHTML = '';
      setShowPlaceholder(false);
    }
  };

  const handleBlur = () => {
    if (editorRef.current && (!content || content.trim() === '')) {
      setShowPlaceholder(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Clear placeholder on any key press if editor is empty
    if (showPlaceholder && e.key.length === 1) {
      setShowPlaceholder(false);
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setIsTyping(true);
  };

  // Save and restore cursor position
  const saveCursorPosition = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(editorRef.current);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      return preCaretRange.toString().length;
    }
    return 0;
  };

  const restoreCursorPosition = (position: number) => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection) return;

    let currentPosition = 0;
    const walker = window.document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node;
    while (node = walker.nextNode()) {
      const nodeLength = node.textContent?.length || 0;
      if (currentPosition + nodeLength >= position) {
        const range = window.document.createRange();
        range.setStart(node, position - currentPosition);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        break;
      }
      currentPosition += nodeLength;
    }
  };

  const formatText = (command: string, value?: string) => {
    const cursorPos = saveCursorPosition();
    window.document.execCommand(command, false, value);
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
      // Small delay to allow DOM to update
      setTimeout(() => restoreCursorPosition(cursorPos), 0);
    }
  };

  const insertHeading = (level: number) => {
    formatText('formatBlock', `h${level}`);
  };

  const insertBlockquote = () => {
    formatText('formatBlock', 'blockquote');
  };

  const changeTextColor = (color: string) => {
    setSelectedColor(color);
    formatText('foreColor', color);
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      formatText('createLink', url);
    }
  };

  const exportAsHTML = () => {
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${title || 'document'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveNow = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    updateDocument(document.id, { content, title });
    saveVersion(document.id, content);
    setLastSaved(new Date());
    setIsTyping(false);
  };

  const mockCollaborators = [
    {
      id: '2',
      name: 'Sarah Johnson',
      avatar: 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      color: '#10B981',
      isTyping: false
    },
    {
      id: '3',
      name: 'Mike Davis',
      avatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      color: '#F59E0B',
      isTyping: true
    }
  ];

  return (
    <div className={`min-h-screen bg-white ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col">
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                className="text-lg font-semibold text-gray-900 bg-transparent border-none outline-none focus:bg-gray-50 px-2 py-1 rounded"
                placeholder="Untitled Document"
              />
              <div className="flex items-center space-x-4 text-sm text-gray-500 px-2">
                <span>
                  {isTyping ? 'Typing...' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'All changes saved'}
                </span>
                <span>•</span>
                <span>{wordCount} words</span>
                <span>•</span>
                <span>{content.replace(/<[^>]*>/g, '').length} characters</span>
                {isTyping && <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Collaborators */}
            <div className="flex items-center space-x-2">
              {mockCollaborators.map((collaborator) => (
                <div key={collaborator.id} className="relative">
                  <img
                    src={collaborator.avatar}
                    alt={collaborator.name}
                    className="w-8 h-8 rounded-full border-2"
                    style={{ borderColor: collaborator.color }}
                    title={collaborator.name}
                  />
                  {collaborator.isTyping && (
                    <div 
                      className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: collaborator.color }}
                    >
                      <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsPreview(!isPreview)}
                className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-2"
              >
                {isPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="hidden md:inline">{isPreview ? 'Edit' : 'Preview'}</span>
              </button>
              
              <button
                onClick={onShowVersions}
                className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-2"
              >
                <History className="w-4 h-4" />
                <span className="hidden md:inline">History</span>
              </button>
              
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Formatting toolbar */}
        {!isPreview && showFormatting && (
          <div className="border-t border-gray-200 px-6 py-3 bg-gray-50">
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              {/* Headings */}
              <div className="flex items-center space-x-1 border-r border-gray-300 pr-3">
                <button
                  onClick={() => insertHeading(1)}
                  className="px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors text-sm font-medium"
                  title="Heading 1"
                >
                  H1
                </button>
                <button
                  onClick={() => insertHeading(2)}
                  className="px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors text-sm font-medium"
                  title="Heading 2"
                >
                  H2
                </button>
                <button
                  onClick={() => insertHeading(3)}
                  className="px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors text-sm font-medium"
                  title="Heading 3"
                >
                  H3
                </button>
              </div>

              {/* Text formatting */}
              <div className="flex items-center space-x-1 border-r border-gray-300 pr-3">
                <button
                  onClick={() => formatText('bold')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  onClick={() => formatText('italic')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  onClick={() => formatText('underline')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Underline (Ctrl+U)"
                >
                  <Underline className="w-4 h-4" />
                </button>
              </div>

              {/* Text Color */}
              <div className="flex items-center space-x-1 border-r border-gray-300 pr-3">
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => changeTextColor(e.target.value)}
                  className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                  title="Text Color"
                />
                <Palette className="w-4 h-4 text-gray-500" />
              </div>

              {/* Lists */}
              <div className="flex items-center space-x-1 border-r border-gray-300 px-3">
                <button
                  onClick={() => formatText('insertUnorderedList')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Bullet List"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => formatText('insertOrderedList')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Numbered List"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>
                <button
                  onClick={insertBlockquote}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Quote"
                >
                  <Quote className="w-4 h-4" />
                </button>
              </div>

              {/* Alignment */}
              <div className="flex items-center space-x-1 border-r border-gray-300 px-3">
                <button
                  onClick={() => formatText('justifyLeft')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Align Left"
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => formatText('justifyCenter')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Align Center"
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button
                  onClick={() => formatText('justifyRight')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Align Right"
                >
                  <AlignRight className="w-4 h-4" />
                </button>
              </div>

              {/* Insert */}
              <div className="flex items-center space-x-1 border-r border-gray-300 px-3">
                <button
                  onClick={insertLink}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Insert Link"
                >
                  <Link className="w-4 h-4" />
                </button>
                <button
                  onClick={() => formatText('insertImage')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Insert Image"
                >
                  <Image className="w-4 h-4" />
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={saveNow}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Save Now"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={exportAsHTML}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Export as HTML"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Editor content */}
      <div className={`${isFullscreen ? 'h-full flex flex-col' : ''}`}>
        <div className={`${isFullscreen ? 'flex-1' : ''} max-w-4xl mx-auto px-6 py-8`}>
          {isPreview ? (
            <div 
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <div className="relative">
              {showPlaceholder && (
                <div className="absolute inset-0 p-6 pointer-events-none text-gray-400 italic">
                  Start writing your document...
                </div>
              )}
              <div
                ref={editorRef}
                contentEditable
                onInput={handleContentChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className={`${isFullscreen ? 'h-full' : 'min-h-[600px]'} outline-none text-gray-900 leading-relaxed prose prose-lg max-w-none focus:ring-0 border border-gray-200 rounded-lg p-6 focus:border-blue-300 transition-colors`}
                style={{
                  fontSize: '16px',
                  lineHeight: '1.75'
                }}
                suppressContentEditableWarning={true}
              />
            </div>
          )}
        </div>
        
        {/* Status bar */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-2 mt-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>Document: {title || 'Untitled'}</span>
              <span>•</span>
              <span>Modified: {document.updatedAt.toLocaleDateString()}</span>
              <span>•</span>
              <span>Auto-save: {isTyping ? 'Pending...' : 'Enabled'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>{wordCount} words, {content.replace(/<[^>]*>/g, '').length} characters</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating action button */}
      <button
        onClick={() => setShowFormatting(!showFormatting)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-105 flex items-center justify-center z-30"
      >
        <Plus className={`w-6 h-6 transition-transform ${showFormatting ? 'rotate-45' : ''}`} />
      </button>
    </div>
  );
}