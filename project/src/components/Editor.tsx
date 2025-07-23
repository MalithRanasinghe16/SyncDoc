import React, { useState, useRef, useEffect } from "react";
import { useDocuments } from "../contexts/DocumentContext";
import apiService from "../services/api";
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
  Focus,
  Copy,
  Globe,
  Users,
  Check,
} from "lucide-react";
import { Document } from "../types";

interface EditorProps {
  document: Document;
  onBack: () => void;
  onShowVersions: () => void;
  isSharedView?: boolean;
}

export default function Editor({
  document,
  onBack,
  onShowVersions,
  isSharedView = false,
}: EditorProps) {
  const { updateDocument, saveVersion } = useDocuments();

  // Determine if editing is allowed
  const canEdit = !isSharedView || (document.shareSettings?.defaultPermission === 'write');
  const canComment = !isSharedView || 
    (document.shareSettings?.defaultPermission === 'comment' || 
     document.shareSettings?.defaultPermission === 'write' ||
     document.shareSettings?.allowComments);

  // Helper function to format dates (same as in Dashboard)
  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;

      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return "Unknown date";
      }

      return dateObj.toLocaleDateString();
    } catch (error) {
      return "Unknown date";
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
  const [selectedColor, setSelectedColor] = useState("#000000");

  // Find & Replace state
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);

  // Focus Mode state
  const [isFocusMode, setIsFocusMode] = useState(false);
  const focusOpacity = 0.3;

  // Share Modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrls, setShareUrls] = useState<{
    read?: string;
    comment?: string;
    write?: string;
  }>({});
  const [sharePermission, setSharePermission] = useState<'read' | 'write' | 'comment'>(
    document.shareSettings?.defaultPermission || 'read'
  );
  const [allowComments, setAllowComments] = useState(
    document.shareSettings?.allowComments ?? true
  );
  const [allowDownload, setAllowDownload] = useState(
    document.shareSettings?.allowDownload ?? true
  );
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState<string | false>(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
  }, [
    content,
    title,
    document.id,
    document.content,
    document.title,
    updateDocument,
    saveVersion,
  ]);

  // Word count effect
  useEffect(() => {
    const textContent = content.replace(/<[^>]*>/g, "").trim();
    const words = textContent ? textContent.split(/\s+/).length : 0;
    setWordCount(words);
  }, [content]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "b":
            e.preventDefault();
            formatText("bold");
            break;
          case "i":
            e.preventDefault();
            formatText("italic");
            break;
          case "u":
            e.preventDefault();
            formatText("underline");
            break;
          case "s":
            e.preventDefault();
            saveNow();
            break;
          case "f":
            e.preventDefault();
            toggleFindReplace();
            break;
          case "d":
            e.preventDefault();
            toggleFocusMode();
            break;
          case "Enter":
            if (e.shiftKey) {
              e.preventDefault();
              setIsFullscreen(!isFullscreen);
            }
            break;
        }
      } else if (e.key === "Escape") {
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

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, showFindReplace, isFocusMode]);

  // Set initial content when component mounts or document changes
  useEffect(() => {
    if (editorRef.current) {
      if (document.content && document.content.trim() !== "") {
        editorRef.current.innerHTML = document.content;
        setShowPlaceholder(false);
      } else {
        editorRef.current.innerHTML = "";
        setShowPlaceholder(true);
      }
    }
  }, [document.content]);

  const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.innerHTML;

    // Clean up empty paragraph tags that browsers sometimes add
    const cleanContent =
      newContent === "<p><br></p>" || newContent === "<br>" ? "" : newContent;

    setContent(cleanContent);
    setIsTyping(true);
    setShowPlaceholder(cleanContent.trim() === "");
  };

  const handleFocus = () => {
    if (editorRef.current && (!content || content.trim() === "")) {
      editorRef.current.innerHTML = "";
      setShowPlaceholder(false);
    }
  };

  const handleBlur = () => {
    if (editorRef.current && (!content || content.trim() === "")) {
      setShowPlaceholder(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Clear placeholder on any key press if editor is empty
    if (showPlaceholder && e.key.length === 1) {
      setShowPlaceholder(false);
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
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
    while ((node = walker.nextNode())) {
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
    formatText("formatBlock", `h${level}`);
  };

  const insertBlockquote = () => {
    formatText("formatBlock", "blockquote");
  };

  const changeTextColor = (color: string) => {
    setSelectedColor(color);
    formatText("foreColor", color);
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) {
      formatText("createLink", url);
    }
  };

  const exportAsHTML = () => {
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${title || "document"}.html`;
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
      const highlighted =
        editorRef.current.querySelectorAll(".search-highlight");
      highlighted.forEach((el) => {
        const parent = el.parentNode;
        if (parent) {
          parent.replaceChild(
            window.document.createTextNode(el.textContent || ""),
            el
          );
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
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }

    const ranges: Range[] = [];
    const flags = matchCase ? "g" : "gi";

    textNodes.forEach((textNode) => {
      const text = textNode.textContent || "";
      const regex = new RegExp(
        searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        flags
      );
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
      const span = window.document.createElement("span");
      span.className = `search-highlight ${
        index === 0 ? "search-current" : ""
      }`;
      span.style.backgroundColor = index === 0 ? "#fbbf24" : "#fef3c7";
      span.style.padding = "1px 2px";
      span.style.borderRadius = "2px";

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
      const firstHighlight = editorRef.current.querySelector(".search-current");
      firstHighlight?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const findNext = () => {
    if (totalMatches === 0) return;

    const nextMatch = currentMatch >= totalMatches ? 1 : currentMatch + 1;
    setCurrentMatch(nextMatch);

    // Update highlighting
    if (editorRef.current) {
      const highlights =
        editorRef.current.querySelectorAll(".search-highlight");
      highlights.forEach((el, index) => {
        const htmlEl = el as HTMLElement;
        if (index === nextMatch - 1) {
          htmlEl.classList.add("search-current");
          htmlEl.style.backgroundColor = "#fbbf24";
          htmlEl.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          htmlEl.classList.remove("search-current");
          htmlEl.style.backgroundColor = "#fef3c7";
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
      const highlights =
        editorRef.current.querySelectorAll(".search-highlight");
      highlights.forEach((el, index) => {
        const htmlEl = el as HTMLElement;
        if (index === prevMatch - 1) {
          htmlEl.classList.add("search-current");
          htmlEl.style.backgroundColor = "#fbbf24";
          htmlEl.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          htmlEl.classList.remove("search-current");
          htmlEl.style.backgroundColor = "#fef3c7";
        }
      });
    }
  };

  const replaceCurrent = () => {
    if (currentMatch === 0 || !replaceText) return;

    const currentHighlight =
      editorRef.current?.querySelector(".search-current");
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
      const flags = matchCase ? "g" : "gi";
      const regex = new RegExp(
        findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        flags
      );
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
    editorRef.current.style.filter = "none";
    editorRef.current.classList.add("focus-mode");

    // Add CSS for focus mode if not already added
    const existingStyle = window.document.getElementById("focus-mode-styles");
    if (!existingStyle) {
      const style = window.document.createElement("style");
      style.id = "focus-mode-styles";
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

    editorRef.current.classList.remove("focus-mode");

    // Remove focus highlights
    const highlights = editorRef.current.querySelectorAll(".focus-highlight");
    highlights.forEach((highlight) => {
      const parent = highlight.parentNode;
      if (parent) {
        parent.replaceChild(
          window.document.createTextNode(highlight.textContent || ""),
          highlight
        );
        parent.normalize();
      }
    });
  };

  const updateFocusHighlight = () => {
    if (!editorRef.current || !isFocusMode) return;

    // Clear existing highlights
    const existingHighlights =
      editorRef.current.querySelectorAll(".focus-highlight");
    existingHighlights.forEach((highlight) => {
      const parent = highlight.parentNode;
      if (parent) {
        parent.replaceChild(
          window.document.createTextNode(highlight.textContent || ""),
          highlight
        );
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
        while ((textNode = walker.nextNode())) {
          textNodes.push(textNode as Text);
        }

        // Find the text node containing the cursor
        const cursorOffset = range.startOffset;
        let currentNode = range.startContainer as Text;

        if (currentNode && currentNode.nodeType === Node.TEXT_NODE) {
          const text = currentNode.textContent || "";

          // Find sentence boundaries
          const beforeCursor = text.substring(0, cursorOffset);
          const afterCursor = text.substring(cursorOffset);

          const sentenceStart = Math.max(
            beforeCursor.lastIndexOf("."),
            beforeCursor.lastIndexOf("!"),
            beforeCursor.lastIndexOf("?"),
            beforeCursor.lastIndexOf("\n")
          );

          const sentenceEnd = (() => {
            const nextPeriod = afterCursor.indexOf(".");
            const nextExclamation = afterCursor.indexOf("!");
            const nextQuestion = afterCursor.indexOf("?");
            const nextNewline = afterCursor.indexOf("\n");

            const candidates = [
              nextPeriod,
              nextExclamation,
              nextQuestion,
              nextNewline,
            ]
              .filter((pos) => pos !== -1)
              .map((pos) => pos + cursorOffset);

            return candidates.length > 0
              ? Math.min(...candidates)
              : text.length;
          })();

          const start = sentenceStart === -1 ? 0 : sentenceStart + 1;
          const end = sentenceEnd;

          if (start < end) {
            const highlightRange = window.document.createRange();
            highlightRange.setStart(currentNode, start);
            highlightRange.setEnd(currentNode, end);

            const span = window.document.createElement("span");
            span.className = "focus-highlight";

            try {
              highlightRange.surroundContents(span);
            } catch (e) {
              // If we can't surround, just highlight the word around cursor
              const wordStart = Math.max(beforeCursor.lastIndexOf(" "), 0);
              const wordEnd = afterCursor.indexOf(" ");
              const wordEndIndex =
                wordEnd === -1 ? text.length : cursorOffset + wordEnd;

              const wordRange = window.document.createRange();
              wordRange.setStart(currentNode, wordStart);
              wordRange.setEnd(currentNode, wordEndIndex);

              const wordSpan = window.document.createElement("span");
              wordSpan.className = "focus-highlight";
              wordRange.surroundContents(wordSpan);
            }
          }
        }
      }
    } catch (error) {
      // Silently fail if highlighting encounters an error
      // This prevents breaking the focus mode functionality
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

      window.document.addEventListener(
        "selectionchange",
        handleSelectionChange
      );
      editorRef.current.addEventListener("click", handleClick);
      editorRef.current.addEventListener("keyup", handleKeyUp);

      return () => {
        window.document.removeEventListener(
          "selectionchange",
          handleSelectionChange
        );
        if (editorRef.current) {
          editorRef.current.removeEventListener("click", handleClick);
          editorRef.current.removeEventListener("keyup", handleKeyUp);
        }
      };
    }
  }, [isFocusMode]);

  const mockCollaborators = [
    {
      id: "2",
      name: "Sarah Johnson",
      avatar:
        "https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2",
      color: "#10B981",
      isTyping: false,
    },
    {
      id: "3",
      name: "Mike Davis",
      avatar:
        "https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2",
      color: "#F59E0B",
      isTyping: true,
    },
  ];

  // Share functions
  const handleGenerateAllLinks = async () => {
    setIsGeneratingLink(true);
    
    try {
      const settings = {
        allowComments,
        allowDownload,
      };
      
      // Generate all three permission links
      const permissions = ['read', 'comment', 'write'] as const;
      const newUrls: { read?: string; comment?: string; write?: string } = {};
      
      for (const permission of permissions) {
        const response = await apiService.generateShareLink(document.id, {
          ...settings,
          defaultPermission: permission
        });
        newUrls[permission] = response.shareUrl;
      }
      
      setShareUrls(newUrls);
    } catch (error) {
      console.error('Failed to generate share links:', error);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopySpecificLink = async (permission: 'read' | 'comment' | 'write') => {
    // If links don't exist, generate them first
    if (!shareUrls.read && !shareUrls.comment && !shareUrls.write) {
      await handleGenerateAllLinks();
    }
    
    // Wait a moment for state to update, then copy the specific link
    setTimeout(async () => {
      const currentUrl = shareUrls[permission];
      if (currentUrl) {
        try {
          await navigator.clipboard.writeText(currentUrl);
          setLinkCopied(permission);
          setTimeout(() => setLinkCopied(false), 2000);
        } catch (error) {
          console.error('Failed to copy link:', error);
        }
      }
    }, 100);
  };

  const handleCopyCurrentPermissionLink = async () => {
    console.log('Copy button clicked, current permission:', sharePermission);
    console.log('Current shareUrls:', shareUrls);
    
    // Check if link already exists for this permission
    if (shareUrls[sharePermission]) {
      // Link exists, just copy it
      console.log('Link already exists, copying:', shareUrls[sharePermission]);
      try {
        await navigator.clipboard.writeText(shareUrls[sharePermission]!);
        setLinkCopied(sharePermission);
        setTimeout(() => setLinkCopied(false), 2000);
        console.log('Existing link copied successfully');
      } catch (error) {
        console.error('Failed to copy existing link:', error);
      }
      return;
    }
    
    // No link exists for this permission, generate it
    console.log(`No link exists for ${sharePermission}, generating...`);
    setIsGeneratingLink(true);
    
    try {
      const settings = {
        allowComments,
        allowDownload,
        defaultPermission: sharePermission
      };
      
      console.log(`Calling API to generate ${sharePermission} link with settings:`, settings);
      
      const response = await apiService.generateShareLink(document.id, settings);
      console.log(`Generated ${sharePermission} link response:`, response);
      console.log(`Full response object:`, JSON.stringify(response, null, 2));
      console.log(`Response.shareUrl:`, response.shareUrl);
      console.log(`Response keys:`, Object.keys(response));
      
      if (response.shareUrl) {
        console.log(`Using shareUrl for ${sharePermission}:`, response.shareUrl);
        
        // Update the state with the new link
        setShareUrls(prev => ({
          ...prev,
          [sharePermission]: response.shareUrl
        }));
        
        // Copy the link to clipboard
        await navigator.clipboard.writeText(response.shareUrl);
        setLinkCopied(sharePermission);
        setTimeout(() => setLinkCopied(false), 2000);
        console.log('Link generated and copied successfully');
      } else {
        console.error(`No shareUrl found in response for ${sharePermission}:`, response);
      }
    } catch (error) {
      console.error('Failed to generate and copy share link:', error);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Initialize shareUrls with existing links from document
  useEffect(() => {
    if (document.shareSettings?.permissionLinks) {
      setShareUrls(document.shareSettings.permissionLinks);
    }
  }, [document.shareSettings]);

  // Reset linkCopied when permission changes
  useEffect(() => {
    setLinkCopied(false);
  }, [sharePermission]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownOpen && showShareModal) {
        const target = event.target as Element;
        if (!target.closest('.dropdown-container')) {
          setDropdownOpen(false);
        }
      }
    };

    window.document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen, showShareModal]);

  return (
    <div
      className={`min-h-screen bg-white dark:bg-gray-900 ${
        isFullscreen ? "fixed inset-0 z-50" : ""
      } ${isFocusMode ? "focus-mode-container" : ""}`}
    >
      {/* Header - Hidden in focus mode */}
      {!isFocusMode && (
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-40">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="flex flex-col">
                <input
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  className="text-lg font-semibold text-gray-900 dark:text-white bg-transparent border-none outline-none focus:bg-gray-50 dark:focus:bg-gray-800 px-2 py-1 rounded"
                  placeholder="Untitled Document"
                />
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 px-2">
                  <span>
                    {isTyping
                      ? "Typing..."
                      : lastSaved
                      ? `Saved ${lastSaved.toLocaleTimeString()}`
                      : "All changes saved"}
                  </span>
                  <span>•</span>
                  <span>{wordCount} words</span>
                  <span>•</span>
                  <span>
                    {content.replace(/<[^>]*>/g, "").length} characters
                  </span>
                  {isTyping && (
                    <div className="w-1 h-1 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-pulse" />
                  )}
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
                  className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center space-x-2"
                >
                  {isPreview ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  <span className="hidden md:inline">
                    {isPreview ? "Edit" : "Preview"}
                  </span>
                </button>

                {!isSharedView && (
                  <button
                    onClick={onShowVersions}
                    className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <History className="w-4 h-4" />
                    <span className="hidden md:inline">History</span>
                  </button>
                )}

                {!isSharedView && (
                  <button 
                    onClick={() => setShowShareModal(true)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center space-x-2"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Formatting toolbar */}
          {!isPreview && showFormatting && canEdit && (
            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-3 bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center space-x-2 flex-wrap gap-2">
                {/* Headings */}
                <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-3">
                  <button
                    onClick={() => insertHeading(1)}
                    className="px-2 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-sm font-medium"
                    title="Heading 1"
                  >
                    H1
                  </button>
                  <button
                    onClick={() => insertHeading(2)}
                    className="px-2 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-sm font-medium"
                    title="Heading 2"
                  >
                    H2
                  </button>
                  <button
                    onClick={() => insertHeading(3)}
                    className="px-2 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-sm font-medium"
                    title="Heading 3"
                  >
                    H3
                  </button>
                </div>

                {/* Text formatting */}
                <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-3">
                  <button
                    onClick={() => formatText("bold")}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Bold (Ctrl+B)"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => formatText("italic")}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Italic (Ctrl+I)"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => formatText("underline")}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Underline (Ctrl+U)"
                  >
                    <Underline className="w-4 h-4" />
                  </button>
                </div>

                {/* Text Color */}
                <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-3">
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => changeTextColor(e.target.value)}
                    className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                    title="Text Color"
                  />
                  <Palette className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>

                {/* Lists */}
                <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 px-3">
                  <button
                    onClick={() => formatText("insertUnorderedList")}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Bullet List"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => formatText("insertOrderedList")}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Numbered List"
                  >
                    <ListOrdered className="w-4 h-4" />
                  </button>
                  <button
                    onClick={insertBlockquote}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Quote"
                  >
                    <Quote className="w-4 h-4" />
                  </button>
                </div>

                {/* Alignment */}
                <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 px-3">
                  <button
                    onClick={() => formatText("justifyLeft")}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Align Left"
                  >
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => formatText("justifyCenter")}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Align Center"
                  >
                    <AlignCenter className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => formatText("justifyRight")}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Align Right"
                  >
                    <AlignRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Insert */}
                <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 px-3">
                  <button
                    onClick={insertLink}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Insert Link"
                  >
                    <Link className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => formatText("insertImage")}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Insert Image"
                  >
                    <Image className="w-4 h-4" />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={toggleFindReplace}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Find & Replace (Ctrl+F)"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  <button
                    onClick={toggleFocusMode}
                    className={`p-2 ${
                      isFocusMode
                        ? "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    } hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors`}
                    title="Focus Mode - Distraction-free writing (Ctrl+D)"
                  >
                    <Focus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={saveNow}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Save Now"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={exportAsHTML}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Export as HTML"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Find & Replace Panel */}
          {showFindReplace && (
            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-white dark:bg-gray-800 shadow-sm">
              <div className="flex items-center space-x-4 max-w-4xl mx-auto">
                <div className="flex items-center space-x-2 flex-1">
                  <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                    <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <input
                      ref={findInputRef}
                      type="text"
                      value={findText}
                      onChange={(e) => setFindText(e.target.value)}
                      placeholder="Find..."
                      className="bg-transparent border-none outline-none text-sm w-40 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
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
                      <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                        {currentMatch}/{totalMatches}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={findPrevious}
                      disabled={totalMatches === 0}
                      className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Previous match (Shift+Enter)"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={findNext}
                      disabled={totalMatches === 0}
                      className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Next match (Enter)"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                    <Replace className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <input
                      type="text"
                      value={replaceText}
                      onChange={(e) => setReplaceText(e.target.value)}
                      placeholder="Replace with..."
                      className="bg-transparent border-none outline-none text-sm w-32 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
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
                      className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Replace current match"
                    >
                      Replace
                    </button>
                    <button
                      onClick={replaceAll}
                      disabled={totalMatches === 0 || !replaceText}
                      className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Replace all matches"
                    >
                      All
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={matchCase}
                      onChange={(e) => setMatchCase(e.target.checked)}
                      className="w-3 h-3 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span>Match case</span>
                  </label>

                  <button
                    onClick={() => {
                      setShowFindReplace(false);
                      clearSearchHighlights();
                    }}
                    className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
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
        <div className="fixed top-4 right-4 z-50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg p-2 flex items-center space-x-2">
          <button
            onClick={toggleFocusMode}
            className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Exit Focus Mode (Ctrl+D or Esc)"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Focus Mode
          </span>
        </div>
      )}

      {/* Enhanced Editor content */}
      <div
        className={`${isFullscreen ? "h-full flex flex-col" : ""} ${
          isFocusMode ? "pt-16" : ""
        }`}
      >
        <div
          className={`${isFullscreen ? "flex-1" : ""} ${
            isFocusMode ? "max-w-3xl" : "max-w-4xl"
          } mx-auto px-6 py-8`}
        >
          {isPreview ? (
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <div className="relative">
              {showPlaceholder && (
                <div className="absolute inset-0 p-6 pointer-events-none text-gray-400 dark:text-gray-500 italic">
                  Start writing your document...
                </div>
              )}
              <div
                ref={editorRef}
                contentEditable={canEdit}
                onInput={canEdit ? handleContentChange : undefined}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={canEdit ? handleKeyDown : undefined}
                className={`${isFullscreen ? "h-full" : "min-h-[600px]"} ${
                  isFocusMode
                    ? "min-h-screen border-none focus:ring-0 shadow-none bg-white dark:bg-gray-900"
                    : "border border-gray-200 dark:border-gray-700 focus:border-blue-300 dark:focus:border-blue-500 bg-white dark:bg-gray-900"
                } ${!canEdit ? "cursor-default" : ""} outline-none text-gray-900 dark:text-gray-100 leading-relaxed prose prose-lg dark:prose-invert max-w-none rounded-lg p-6 transition-colors`}
                style={{
                  fontSize: isFocusMode ? "18px" : "16px",
                  lineHeight: "1.75",
                }}
                suppressContentEditableWarning={true}
              />
            </div>
          )}
        </div>

        {/* Status bar - Hidden in focus mode */}
        {!isFocusMode && (
          <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6 py-2 mt-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-4">
                <span>Document: {title || "Untitled"}</span>
                <span>•</span>
                <span>Modified: {formatDate(document.updatedAt)}</span>
                <span>•</span>
                <span>Auto-save: {isTyping ? "Pending..." : "Enabled"}</span>
              </div>
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>
                  {wordCount} words, {content.replace(/<[^>]*>/g, "").length}{" "}
                  characters
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating action button - Hidden in focus mode */}
      {!isFocusMode && (
        <button
          onClick={() => setShowFormatting(!showFormatting)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 dark:bg-blue-700 text-white rounded-full shadow-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-all hover:scale-105 flex items-center justify-center z-30"
        >
          <Plus
            className={`w-6 h-6 transition-transform ${
              showFormatting ? "rotate-45" : ""
            }`}
          />
        </button>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Share Document
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Permission Level Dropdown and Copy Link */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">General access</h4>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center shadow-sm">
                      <Globe className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0 relative dropdown-container">
                      <div className="cursor-default">
                        <div className="text-gray-900 dark:text-white font-semibold text-sm">
                          {sharePermission === 'read' && 'Viewer'}
                          {sharePermission === 'comment' && 'Commenter'}
                          {sharePermission === 'write' && 'Editor'}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                          {sharePermission === 'read' && 'Anyone on the internet with the link can view'}
                          {sharePermission === 'comment' && 'Anyone on the internet with the link can comment'}
                          {sharePermission === 'write' && 'Anyone on the internet with the link can edit'}
                        </p>
                      </div>
                      
                      {/* Custom Dropdown */}
                      {dropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50">
                          <div className="py-1">
                            <button
                              onClick={() => {
                                setSharePermission('read');
                                setDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                                sharePermission === 'read' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              <div className="font-medium">Viewer</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Can view the document</div>
                            </button>
                            <button
                              onClick={() => {
                                setSharePermission('comment');
                                setDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                                sharePermission === 'comment' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              <div className="font-medium">Commenter</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Can view and comment</div>
                            </button>
                            <button
                              onClick={() => {
                                setSharePermission('write');
                                setDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                                sharePermission === 'write' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              <div className="font-medium">Editor</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Can view, comment, and edit</div>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className={`ml-2 w-6 h-6 rounded-full ${
                        dropdownOpen 
                          ? 'bg-blue-100 dark:bg-blue-900/30' 
                          : 'bg-gray-200 dark:bg-gray-600'
                      } hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center justify-center transition-colors cursor-pointer`}
                    >
                      <ChevronDown className={`w-3 h-3 ${
                        dropdownOpen 
                          ? 'text-blue-600 dark:text-blue-400 transform rotate-180' 
                          : 'text-gray-600 dark:text-gray-300'
                      } transition-transform`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Additional Settings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Allow comments</span>
                  <button
                    onClick={() => setAllowComments(!allowComments)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                      allowComments ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        allowComments ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Allow download</span>
                  <button
                    onClick={() => setAllowDownload(!allowDownload)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                      allowDownload ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        allowDownload ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <div className="flex space-x-3 w-full">
                  <button
                    onClick={handleCopyCurrentPermissionLink}
                    disabled={isGeneratingLink}
                    className="flex-1 px-6 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                  >
                    {isGeneratingLink ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                        <span>Generating...</span>
                      </>
                    ) : linkCopied === sharePermission ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Link className="w-4 h-4" />
                        <span>Copy link</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                <div className="flex items-start space-x-2">
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    Anyone with this link will be able to access the document with the selected permissions.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Read-only banner for shared documents */}
          {isSharedView && !canEdit && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-6 py-3">
              <div className="flex items-center justify-center space-x-2 text-blue-800 dark:text-blue-200">
                <Eye className="w-4 h-4" />
                <span className="text-sm font-medium">
                  You're viewing this document in read-only mode
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
