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
  FileText,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Replace,
  Focus
} from 'lucide-react';
import { Document } from '../types';

interface EditorProps {
  document: Document;
  onBack: () => void;
  onShowVersions: () => void;
}

export default function Editor({ document, onBack, onShowVersions }: EditorProps) {
  const { updateDocument, saveVersion } = useDocuments();
  
  // Helper function to format dates (same as in Dashboard)
  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Unknown date';
      }
      
      return dateObj.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', date, error);
      return 'Unknown date';
    }
  };
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
  
  // Find & Replace state
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  
  // Focus Mode state
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusOpacity] = useState(0.3);
  
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<number>();
  const findInputRef = useRef<HTMLInputElement>(null);

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
          case 'f':
            e.preventDefault();
            toggleFindReplace();
            break;
          case 'd':
            e.preventDefault();
            toggleFocusMode();
            break;
          case 'Enter':
            if (e.shiftKey) {
              e.preventDefault();
              setIsFullscreen(!isFullscreen);
            }
            break;
        }
      } else if (e.key === 'Escape') {
        if (showFindReplace) {
          e.preventDefault();
          setShowFindReplace(false);
          clearSearchHighlights();
        } else if (isFocusMode) {
          e.preventDefault();
          setIsFocusMode(false);
          clearFocusMode();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, showFindReplace, isFocusMode]);

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

  // Find & Replace functionality
  const clearSearchHighlights = () => {
    if (editorRef.current) {
      const highlighted = editorRef.current.querySelectorAll('.search-highlight');
      highlighted.forEach(el => {
        const parent = el.parentNode;
        if (parent) {
          parent.replaceChild(window.document.createTextNode(el.textContent || ''), el);
          parent.normalize();
        }
      });
    }
  };

  const highlightMatches = (searchText: string) => {
    if (!editorRef.current || !searchText) {
      clearSearchHighlights();
      setTotalMatches(0);
      setCurrentMatch(0);
      return;
    }

    clearSearchHighlights();
    
    const walker = window.document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes: Text[] = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node as Text);
    }

    const ranges: Range[] = [];
    const flags = matchCase ? 'g' : 'gi';
    
    textNodes.forEach(textNode => {
      const text = textNode.textContent || '';
      const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        const range = window.document.createRange();
        range.setStart(textNode, match.index);
        range.setEnd(textNode, match.index + match[0].length);
        ranges.push(range);
      }
    });

    // Highlight all matches
    ranges.forEach((range, index) => {
      const span = window.document.createElement('span');
      span.className = `search-highlight ${index === 0 ? 'search-current' : ''}`;
      span.style.backgroundColor = index === 0 ? '#fbbf24' : '#fef3c7';
      span.style.padding = '1px 2px';
      span.style.borderRadius = '2px';
      
      try {
        range.surroundContents(span);
      } catch (e) {
        // Handle cases where range spans multiple elements
        const contents = range.extractContents();
        span.appendChild(contents);
        range.insertNode(span);
      }
    });

    setTotalMatches(ranges.length);
    setCurrentMatch(ranges.length > 0 ? 1 : 0);
    
    // Scroll to first match
    if (ranges.length > 0) {
      const firstHighlight = editorRef.current.querySelector('.search-current');
      firstHighlight?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const findNext = () => {
    if (totalMatches === 0) return;
    
    const nextMatch = currentMatch >= totalMatches ? 1 : currentMatch + 1;
    setCurrentMatch(nextMatch);
    
    // Update highlighting
    if (editorRef.current) {
      const highlights = editorRef.current.querySelectorAll('.search-highlight');
      highlights.forEach((el, index) => {
        const htmlEl = el as HTMLElement;
        if (index === nextMatch - 1) {
          htmlEl.classList.add('search-current');
          htmlEl.style.backgroundColor = '#fbbf24';
          htmlEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          htmlEl.classList.remove('search-current');
          htmlEl.style.backgroundColor = '#fef3c7';
        }
      });
    }
  };

  const findPrevious = () => {
    if (totalMatches === 0) return;
    
    const prevMatch = currentMatch <= 1 ? totalMatches : currentMatch - 1;
    setCurrentMatch(prevMatch);
    
    // Update highlighting
    if (editorRef.current) {
      const highlights = editorRef.current.querySelectorAll('.search-highlight');
      highlights.forEach((el, index) => {
        const htmlEl = el as HTMLElement;
        if (index === prevMatch - 1) {
          htmlEl.classList.add('search-current');
          htmlEl.style.backgroundColor = '#fbbf24';
          htmlEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          htmlEl.classList.remove('search-current');
          htmlEl.style.backgroundColor = '#fef3c7';
        }
      });
    }
  };

  const replaceCurrent = () => {
    if (currentMatch === 0 || !replaceText) return;
    
    const currentHighlight = editorRef.current?.querySelector('.search-current');
    if (currentHighlight) {
      currentHighlight.textContent = replaceText;
      currentHighlight.outerHTML = replaceText;
      
      // Update content and re-search
      if (editorRef.current) {
        setContent(editorRef.current.innerHTML);
        setTimeout(() => highlightMatches(findText), 100);
      }
    }
  };

  const replaceAll = () => {
    if (!findText || !replaceText) return;
    
    clearSearchHighlights();
    if (editorRef.current) {
      const flags = matchCase ? 'g' : 'gi';
      const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      const newContent = content.replace(regex, replaceText);
      editorRef.current.innerHTML = newContent;
      setContent(newContent);
      setTotalMatches(0);
      setCurrentMatch(0);
    }
  };

  const toggleFindReplace = () => {
    setShowFindReplace(!showFindReplace);
    if (!showFindReplace) {
      clearSearchHighlights();
      setTimeout(() => findInputRef.current?.focus(), 100);
    }
  };

  // Focus Mode functionality
  const toggleFocusMode = () => {
    setIsFocusMode(!isFocusMode);
    if (!isFocusMode) {
      // Entering focus mode
      applyFocusMode();
    } else {
      // Exiting focus mode
      clearFocusMode();
    }
  };

  const applyFocusMode = () => {
    if (!editorRef.current) return;
    
    // Add focus mode styles to the editor
    editorRef.current.style.filter = 'none';
    editorRef.current.classList.add('focus-mode');
    
    // Add CSS for focus mode if not already added
    const existingStyle = window.document.getElementById('focus-mode-styles');
    if (!existingStyle) {
      const style = window.document.createElement('style');
      style.id = 'focus-mode-styles';
      style.textContent = `
        .focus-mode {
          position: relative;
        }
        
        .focus-mode::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            to bottom,
            rgba(255, 255, 255, ${1 - focusOpacity}) 0%,
            rgba(255, 255, 255, 0) 40%,
            rgba(255, 255, 255, 0) 60%,
            rgba(255, 255, 255, ${1 - focusOpacity}) 100%
          );
          pointer-events: none;
          z-index: 1;
          transition: all 0.3s ease;
        }
        
        .focus-mode-content {
          position: relative;
          z-index: 2;
        }
        
        .focus-highlight {
          background-color: rgba(59, 130, 246, 0.1);
          border-radius: 4px;
          padding: 2px 4px;
          animation: focusPulse 2s ease-in-out infinite;
        }
        
        @keyframes focusPulse {
          0%, 100% { background-color: rgba(59, 130, 246, 0.1); }
          50% { background-color: rgba(59, 130, 246, 0.2); }
        }
        
        .focus-mode-typewriter {
          border-right: 2px solid #3b82f6;
          animation: blink 1s infinite;
        }
        
        @keyframes blink {
          0%, 50% { border-color: #3b82f6; }
          51%, 100% { border-color: transparent; }
        }
      `;
      window.document.head.appendChild(style);
    }
    
    updateFocusHighlight();
  };

  const clearFocusMode = () => {
    if (!editorRef.current) return;
    
    editorRef.current.classList.remove('focus-mode');
    
    // Remove focus highlights
    const highlights = editorRef.current.querySelectorAll('.focus-highlight');
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      if (parent) {
        parent.replaceChild(window.document.createTextNode(highlight.textContent || ''), highlight);
        parent.normalize();
      }
    });
  };

  const updateFocusHighlight = () => {
    if (!editorRef.current || !isFocusMode) return;
    
    // Clear existing highlights
    const existingHighlights = editorRef.current.querySelectorAll('.focus-highlight');
    existingHighlights.forEach(highlight => {
      const parent = highlight.parentNode;
      if (parent) {
        parent.replaceChild(window.document.createTextNode(highlight.textContent || ''), highlight);
        parent.normalize();
      }
    });
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    try {
      const range = selection.getRangeAt(0);
      let container = range.commonAncestorContainer;
      
      // Find the paragraph or block element containing the cursor
      while (container && container.nodeType !== Node.ELEMENT_NODE) {
        container = container.parentNode as Node;
      }
      
      if (container && editorRef.current.contains(container)) {
        // Find the sentence or line around the cursor
        const walker = window.document.createTreeWalker(
          container,
          NodeFilter.SHOW_TEXT,
          null
        );
        
        let textNode;
        let textNodes: Text[] = [];
        while (textNode = walker.nextNode()) {
          textNodes.push(textNode as Text);
        }
        
        // Find the text node containing the cursor
        const cursorOffset = range.startOffset;
        let currentNode = range.startContainer as Text;
        
        if (currentNode && currentNode.nodeType === Node.TEXT_NODE) {
          const text = currentNode.textContent || '';
          
          // Find sentence boundaries
          const beforeCursor = text.substring(0, cursorOffset);
          const afterCursor = text.substring(cursorOffset);
          
          const sentenceStart = Math.max(
            beforeCursor.lastIndexOf('.'),
            beforeCursor.lastIndexOf('!'),
            beforeCursor.lastIndexOf('?'),
            beforeCursor.lastIndexOf('\n')
          );
          
          const sentenceEnd = (() => {
            const nextPeriod = afterCursor.indexOf('.');
            const nextExclamation = afterCursor.indexOf('!');
            const nextQuestion = afterCursor.indexOf('?');
            const nextNewline = afterCursor.indexOf('\n');
            
            const candidates = [nextPeriod, nextExclamation, nextQuestion, nextNewline]
              .filter(pos => pos !== -1)
              .map(pos => pos + cursorOffset);
            
            return candidates.length > 0 ? Math.min(...candidates) : text.length;
          })();
          
          const start = sentenceStart === -1 ? 0 : sentenceStart + 1;
          const end = sentenceEnd;
          
          if (start < end) {
            const highlightRange = window.document.createRange();
            highlightRange.setStart(currentNode, start);
            highlightRange.setEnd(currentNode, end);
            
            const span = window.document.createElement('span');
            span.className = 'focus-highlight';
            
            try {
              highlightRange.surroundContents(span);
            } catch (e) {
              // If we can't surround, just highlight the word around cursor
              const wordStart = Math.max(beforeCursor.lastIndexOf(' '), 0);
              const wordEnd = afterCursor.indexOf(' ');
              const wordEndIndex = wordEnd === -1 ? text.length : cursorOffset + wordEnd;
              
              const wordRange = window.document.createRange();
              wordRange.setStart(currentNode, wordStart);
              wordRange.setEnd(currentNode, wordEndIndex);
              
              const wordSpan = window.document.createElement('span');
              wordSpan.className = 'focus-highlight';
              wordRange.surroundContents(wordSpan);
            }
          }
        }
      }
    } catch (error) {
      // If highlighting fails, just continue
      console.warn('Focus mode highlighting failed:', error);
    }
  };

  // Update search when find text or match case changes
  useEffect(() => {
    if (findText) {
      const debounceTimer = setTimeout(() => {
        highlightMatches(findText);
      }, 300);
      return () => clearTimeout(debounceTimer);
    } else {
      clearSearchHighlights();
      setTotalMatches(0);
      setCurrentMatch(0);
    }
  }, [findText, matchCase, content]);

  // Focus mode effect
  useEffect(() => {
    if (isFocusMode && editorRef.current) {
      const handleSelectionChange = () => {
        setTimeout(() => updateFocusHighlight(), 10);
      };
      
      const handleClick = () => {
        setTimeout(() => updateFocusHighlight(), 10);
      };
      
      const handleKeyUp = () => {
        setTimeout(() => updateFocusHighlight(), 10);
      };

      window.document.addEventListener('selectionchange', handleSelectionChange);
      editorRef.current.addEventListener('click', handleClick);
      editorRef.current.addEventListener('keyup', handleKeyUp);

      return () => {
        window.document.removeEventListener('selectionchange', handleSelectionChange);
        if (editorRef.current) {
          editorRef.current.removeEventListener('click', handleClick);
          editorRef.current.removeEventListener('keyup', handleKeyUp);
        }
      };
    }
  }, [isFocusMode]);

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
    <div className={`min-h-screen bg-white ${isFullscreen ? 'fixed inset-0 z-50' : ''} ${isFocusMode ? 'focus-mode-container' : ''}`}>
      {/* Header - Hidden in focus mode */}
      {!isFocusMode && (
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
                  onClick={toggleFindReplace}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Find & Replace (Ctrl+F)"
                >
                  <Search className="w-4 h-4" />
                </button>
                <button
                  onClick={toggleFocusMode}
                  className={`p-2 ${isFocusMode 
                    ? 'text-blue-600 bg-blue-100' 
                    : 'text-gray-600 hover:text-gray-900'
                  } hover:bg-gray-100 rounded transition-colors`}
                  title="Focus Mode - Distraction-free writing (Ctrl+D)"
                >
                  <Focus className="w-4 h-4" />
                </button>
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

        {/* Find & Replace Panel */}
        {showFindReplace && (
          <div className="border-t border-gray-200 px-6 py-4 bg-white shadow-sm">
            <div className="flex items-center space-x-4 max-w-4xl mx-auto">
              <div className="flex items-center space-x-2 flex-1">
                <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-2">
                  <Search className="w-4 h-4 text-gray-500" />
                  <input
                    ref={findInputRef}
                    type="text"
                    value={findText}
                    onChange={(e) => setFindText(e.target.value)}
                    placeholder="Find..."
                    className="bg-transparent border-none outline-none text-sm w-40"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (e.shiftKey) {
                          findPrevious();
                        } else {
                          findNext();
                        }
                      }
                    }}
                  />
                  {totalMatches > 0 && (
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                      {currentMatch}/{totalMatches}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={findPrevious}
                    disabled={totalMatches === 0}
                    className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Previous match (Shift+Enter)"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={findNext}
                    disabled={totalMatches === 0}
                    className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Next match (Enter)"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-2">
                  <Replace className="w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={replaceText}
                    onChange={(e) => setReplaceText(e.target.value)}
                    placeholder="Replace with..."
                    className="bg-transparent border-none outline-none text-sm w-32"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        replaceCurrent();
                      }
                    }}
                  />
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={replaceCurrent}
                    disabled={currentMatch === 0 || !replaceText}
                    className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Replace current match"
                  >
                    Replace
                  </button>
                  <button
                    onClick={replaceAll}
                    disabled={totalMatches === 0 || !replaceText}
                    className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Replace all matches"
                  >
                    All
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-1 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={matchCase}
                    onChange={(e) => setMatchCase(e.target.checked)}
                    className="w-3 h-3"
                  />
                  <span>Match case</span>
                </label>

                <button
                  onClick={() => {
                    setShowFindReplace(false);
                    clearSearchHighlights();
                  }}
                  className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Focus Mode Mini Header */}
      {isFocusMode && (
        <div className="fixed top-4 right-4 z-50 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 flex items-center space-x-2">
          <button
            onClick={toggleFocusMode}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
            title="Exit Focus Mode (Ctrl+D or Esc)"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-500">Focus Mode</span>
        </div>
      )}

      {/* Enhanced Editor content */}
      <div className={`${isFullscreen ? 'h-full flex flex-col' : ''} ${isFocusMode ? 'pt-16' : ''}`}>
        <div className={`${isFullscreen ? 'flex-1' : ''} ${isFocusMode ? 'max-w-3xl' : 'max-w-4xl'} mx-auto px-6 py-8`}>
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
                className={`${isFullscreen ? 'h-full' : 'min-h-[600px]'} ${isFocusMode ? 'min-h-screen border-none focus:ring-0 shadow-none' : 'border border-gray-200 focus:border-blue-300'} outline-none text-gray-900 leading-relaxed prose prose-lg max-w-none rounded-lg p-6 transition-colors`}
                style={{
                  fontSize: isFocusMode ? '18px' : '16px',
                  lineHeight: '1.75'
                }}
                suppressContentEditableWarning={true}
              />
            </div>
          )}
        </div>
        
        {/* Status bar - Hidden in focus mode */}
        {!isFocusMode && (
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-2 mt-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-4">
                <span>Document: {title || 'Untitled'}</span>
                <span>•</span>
                <span>Modified: {formatDate(document.updatedAt)}</span>
                <span>•</span>
                <span>Auto-save: {isTyping ? 'Pending...' : 'Enabled'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>{wordCount} words, {content.replace(/<[^>]*>/g, '').length} characters</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating action button - Hidden in focus mode */}
      {!isFocusMode && (
        <button
          onClick={() => setShowFormatting(!showFormatting)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-105 flex items-center justify-center z-30"
        >
          <Plus className={`w-6 h-6 transition-transform ${showFormatting ? 'rotate-45' : ''}`} />
        </button>
      )}
    </div>
  );
}