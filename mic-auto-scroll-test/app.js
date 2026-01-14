// Mic Auto-Scroll Test Application
// This is a prototype for automatic lyric scrolling based on microphone input

class MicAutoScroll {
    constructor() {
        this.recognition = null;
        this.mediaStream = null;
        this.audioContext = null;
        this.analyser = null;
        this.isListening = false;
        this.currentLineIndex = 0;
        this.lyrics = [];
        this.lyricsText = '';
        this.audioLevel = 0;
        this.progressPercent = 0;
        this.zoomLevel = 1; // Zoom level (1 = 100%, 1.5 = 150%, etc.)
        this.baseFontSize = null; // Will store the original font size
        this.baseZoomLevel = 18; // Base font size in pixels (matching production)
        
        // Pinch gesture state
        this.isPinching = false;
        this.initialPinchDistance = 0;
        this.initialZoomLevel = 1;
        
        // Sequence-aware matching state
        this.candidateHistory = []; // Recent detected line indices with timestamps
        this.lastAdvanceTimestamp = null;
        this.WINDOW_FORWARD = 12; // Max forward search window in lines
        this.EVIDENCE_GATE_JUMP_THRESHOLD = 10; // Lines beyond window that require evidence gate
        this.EVIDENCE_CONSECUTIVE_LINES = 2; // Number of consecutive lines needed for large jump
        this.EVIDENCE_TIME_WINDOW_MS = 3000; // Time window for evidence gathering (3 seconds)
        this.DISTANCE_PENALTY_FACTOR = 0.05; // Penalty per line distance for repeated phrases
        this.highConfidenceCount = 0; // Track consecutive high confidence detections for commit mode
        
        // Block-based scrolling state
        this.LINES_PER_BLOCK = 4; // Number of lines to consider a "block" for confident scrolling
        this.VIEWPORT_OFFSET_LINES = 2; // How many lines ahead of current to show (keeps upcoming lines visible)
        
        // Smooth scroll state
        this.scrollAnimationId = null;
        this.targetLineIndex = null;
        this.lastScrollPosition = 0; // Track last scroll position for monotonic scroll
        this.scrollBaselineSpeed = 1.5; // Baseline scroll speed in pixels per frame (slow)
        this.scrollMaxSpeed = 12; // Maximum scroll speed when catching up
        this.closeDistanceThreshold = 150; // Distance in pixels to consider "close" to target
        this.lastLoggedLineIndex = null; // Track last logged lineIndex for debug throttling
        this.lastLoggedScrollTop = null; // Track last logged scrollTop for debug throttling
        this.lastComputedZoomLevel = 1; // Track zoom level changes
        
        this.initializeElements();
        this.setupDebugConsole(); // Must be after initializeElements to access consoleContainer
        this.loadLyrics();
        this.setupEventListeners();
        this.applyZoom(); // Initialize zoom to 100%
    }
    
    setupDebugConsole() {
        if (!this.consoleContainer || !this.clearConsoleBtn) {
            console.warn('Console elements not found, skipping debug console setup');
            return;
        }
        
        // Intercept console.log to display in UI
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        
        const self = this;
        
        console.log = function(...args) {
            originalLog.apply(console, args);
            const message = args.map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg, null, 2);
                    } catch (e) {
                        return String(arg);
                    }
                }
                return String(arg);
            }).join(' ');
            self.addConsoleEntry('log', message);
        };
        
        console.error = function(...args) {
            originalError.apply(console, args);
            const message = args.map(arg => String(arg)).join(' ');
            self.addConsoleEntry('error', message);
        };
        
        console.warn = function(...args) {
            originalWarn.apply(console, args);
            const message = args.map(arg => String(arg)).join(' ');
            self.addConsoleEntry('warn', message);
        };
        
        // Clear console button
        this.clearConsoleBtn.addEventListener('click', () => {
            this.consoleContainer.innerHTML = '<div class="console-entry">Console cleared...</div>';
        });
    }
    
    addConsoleEntry(type, message) {
        if (!this.consoleContainer) return;
        
        const entry = document.createElement('div');
        entry.className = `console-entry console-${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '📝';
        
        // Format message - highlight [SCROLL DEBUG] entries
        // Split by [SCROLL DEBUG] to preserve formatting
        const parts = message.split('[SCROLL DEBUG]');
        let formattedMessage = '';
        
        if (parts.length > 1) {
            // First part is normal text
            const textNode1 = document.createTextNode(parts[0]);
            const tempDiv1 = document.createElement('div');
            tempDiv1.appendChild(textNode1);
            formattedMessage += tempDiv1.innerHTML;
            
            // Add [SCROLL DEBUG] tag
            formattedMessage += '<span class="console-debug-tag">[SCROLL DEBUG]</span>';
            
            // Remaining parts
            for (let i = 1; i < parts.length; i++) {
                const textNode = document.createTextNode(parts[i]);
                const tempDiv = document.createElement('div');
                tempDiv.appendChild(textNode);
                formattedMessage += tempDiv.innerHTML;
            }
        } else {
            // No [SCROLL DEBUG] tag, just escape normally
            const textNode = document.createTextNode(message);
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(textNode);
            formattedMessage = tempDiv.innerHTML;
        }
        
        entry.innerHTML = `<span class="console-time">${timestamp}</span> <span class="console-prefix">${prefix}</span> <span class="console-message">${formattedMessage}</span>`;
        
        this.consoleContainer.appendChild(entry);
        
        // Keep only last 200 entries to prevent performance issues
        const entries = this.consoleContainer.querySelectorAll('.console-entry');
        if (entries.length > 200) {
            entries[0].remove();
        }
        
        // Auto-scroll to bottom
        const container = this.consoleContainer.parentElement;
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    initializeElements() {
        this.startMicBtn = document.getElementById('startMic');
        this.stopMicBtn = document.getElementById('stopMic');
        this.micStatus = document.getElementById('micStatus');
        this.recognitionStatus = document.getElementById('recognitionStatus');
        
        // Update status elements if they exist in debug panel
        if (this.micStatusEl) {
            // micStatusEl is in debug panel, keep micStatus for old UI compatibility
        }
        // Support both old and new HTML structure
        // In new iOS-style HTML, lyricsScroll is the scroll container, not lyricsContainer
        this.lyricsContainer = document.getElementById('lyricsContainer') || document.getElementById('lyricsScroll');
        // Store reference to the scroll container for new structure
        this.scrollContainer = document.getElementById('lyricsScroll') || document.getElementById('lyricsContainer');
        this.lyricsTextEl = document.getElementById('lyricsText');
        this.progressOverlay = document.getElementById('progressOverlay');
        this.recognizedTextEl = document.getElementById('recognizedText');
        this.currentLineEl = document.getElementById('currentLine');
        this.matchConfidenceEl = document.getElementById('matchConfidence');
        this.audioLevelEl = document.getElementById('audioLevel');
        this.zoomInBtn = document.getElementById('zoomIn');
        this.zoomOutBtn = document.getElementById('zoomOut');
        this.zoomResetBtn = document.getElementById('zoomReset');
        this.zoomLevelEl = document.getElementById('zoomLevel');
        this.consoleContainer = document.getElementById('consoleLogs');
        this.clearConsoleBtn = document.getElementById('clearConsole');
        
        // Optional elements for new iOS-style UI
        this.micStatusEl = document.getElementById('micStatus');
        this.recognitionStatusEl = document.getElementById('recognitionStatus');
        this.boldBtn = document.getElementById('boldBtn');
    }

    loadLyrics() {
        // Get the full lyrics text
        this.lyricsText = this.lyricsTextEl.textContent;
        
        // Split into lines for matching purposes
        const lines = this.lyricsText.split('\n').filter(line => line.trim().length > 0);
        this.lyrics = lines.map((text, index) => ({
            text: text.trim(),
            index: index,
            startPosition: this.getLineStartPosition(index),
            endPosition: this.getLineEndPosition(index)
        }));
        
        // Calculate line positions in the DOM after lyrics are loaded
        this.calculateLinePositions();
    }
    
    calculateLinePositions() {
        // Calculate approximate scroll positions for each line
        // This helps us determine where lines are in the scrollable container
        const containerWrapper = this.getScrollContainer();
        const scrollHeight = containerWrapper.scrollHeight - containerWrapper.clientHeight;
        
        this.lyrics.forEach((lyric, index) => {
            // Approximate position based on progress percentage
            const progress = (index + 1) / this.lyrics.length;
            lyric.scrollPosition = progress * scrollHeight;
        });
    }
    
    getScrollContainer() {
        // Support both old wrapper structure and new direct scroll container
        // In old structure: lyricsContainer has a parent wrapper
        // In new structure: lyricsScroll (stored in scrollContainer) is the scroll container directly
        if (this.scrollContainer) {
            return this.scrollContainer;
        }
        if (this.lyricsContainer.parentElement?.classList?.contains('lyrics-container-wrapper')) {
            return this.lyricsContainer.parentElement;
        }
        return this.lyricsContainer;
    }

    getLineScrollPosition(lineIndex, previousLineIndex = null) {
        // Get the scroll position for a line using actual DOM measurements (zoom-safe)
        if (lineIndex < 0 || lineIndex >= this.lyrics.length) {
            return 0;
        }
        
        const containerWrapper = this.getScrollContainer();
        const maxScroll = containerWrapper.scrollHeight - containerWrapper.clientHeight;
        
        // Prevent negative or exceeding max scroll
        if (maxScroll <= 0) {
            return 0;
        }
        
        // Calculate advanceLines based on previousLineIndex (before currentLineIndex was updated)
        // If previousLineIndex is provided, use it; otherwise fall back to currentLineIndex
        const previousIdx = previousLineIndex !== null ? previousLineIndex : this.currentLineIndex;
        const advanceLines = lineIndex > previousIdx ? lineIndex - previousIdx : 0;
        
        // Only log when lineIndex changes or zoom changes
        const shouldLog = (lineIndex !== this.lastLoggedLineIndex) || (this.zoomLevel !== this.lastComputedZoomLevel);
        if (shouldLog) {
            this.lastLoggedLineIndex = lineIndex;
            this.lastComputedZoomLevel = this.zoomLevel;
            console.log(`[SCROLL DEBUG] getLineScrollPosition(${lineIndex}):`, {
                containerScrollTop: containerWrapper.scrollTop,
                containerClientHeight: containerWrapper.clientHeight,
                containerScrollHeight: containerWrapper.scrollHeight,
                maxScroll: maxScroll,
                zoomLevel: this.zoomLevel,
                previousLineIndex: previousIdx,
                advanceLines: advanceLines
            });
        }
        
        // Get computed styles - these automatically account for zoom (font-size scaling)
        // Since zoom is implemented via font-size, computed styles reflect the zoomed size
        const computedStyle = window.getComputedStyle(this.lyricsTextEl);
        const fontSize = parseFloat(computedStyle.fontSize);
        const lineHeight = parseFloat(computedStyle.lineHeight) || fontSize * 1.8;
        
        // Get container padding from computed styles (accounts for zoom)
        const containerComputedStyle = window.getComputedStyle(this.lyricsContainer);
        const containerPaddingTop = parseFloat(containerComputedStyle.paddingTop) || 40;
        
        // Calculate approximate scroll position based on line index
        // Each line takes approximately lineHeight pixels (already accounts for zoom via fontSize)
        const lineIndexInText = lineIndex; // Index in filtered lines array
        
        // Estimate position: each line takes approximately lineHeight pixels
        // This calculation is zoom-safe because fontSize and lineHeight scale with zoom
        const estimatedTopPosition = containerPaddingTop + (lineIndexInText * lineHeight);
        
        // Determine if we should use "commit mode" (aggressive positioning near top)
        const isCommitMode = this.isCommitMode(lineIndex, advanceLines);
        
        // Dynamic anchor ratio based on commit mode and confidence
        // Commit mode: 15-20% from top (current line near top, mostly upcoming lines visible)
        // Early/low confidence: 35% from top (safer middle position)
        let anchorRatio;
        if (isCommitMode) {
            anchorRatio = 0.20; // 20% from top for commit mode
        } else {
            anchorRatio = 0.35; // 35% from top for early/safe mode
        }
        
        const targetViewportOffset = containerWrapper.clientHeight * anchorRatio;
        
        // Calculate preferred scroll position
        let preferredScroll = estimatedTopPosition - targetViewportOffset;
        
        // Apply block-based scrolling adjustment using advanceLines (computed from previousLineIndex)
        // This correctly identifies block advances because it uses the previous index before currentLineIndex was updated
        if (advanceLines >= this.LINES_PER_BLOCK) {
            // Confidently passed a block - scroll more aggressively to push old lines out of view
            // In commit mode, be even more aggressive
            const generousOffset = isCommitMode 
                ? containerWrapper.clientHeight * 0.15  // 15% from top in commit mode
                : containerWrapper.clientHeight * 0.25; // 25% from top for block advance in safe mode
            preferredScroll = estimatedTopPosition - generousOffset;
        }
        
        // Limit past lines visible: ensure we don't show too many lines above current
        // Calculate how many lines would be visible above current line at the preferred scroll position
        const maxPastLines = isCommitMode ? 2 : 3; // Commit mode: max 2 past lines, safe mode: max 3
        const maxPastLinesPixels = maxPastLines * lineHeight;
        
        // Check if preferred scroll position would show too many past lines
        // The scroll position determines where the top of the viewport is relative to the line
        // If preferredScroll is too low, too many lines above will be visible
        const scrollPositionRelativeToLine = estimatedTopPosition - preferredScroll;
        
        if (scrollPositionRelativeToLine > maxPastLinesPixels) {
            // Too many past lines would be visible, adjust scroll to limit them
            preferredScroll = estimatedTopPosition - maxPastLinesPixels;
        }
        
        // Ensure we don't scroll past the beginning or end
        preferredScroll = Math.max(0, preferredScroll);
        preferredScroll = Math.min(preferredScroll, maxScroll);
        
        // Only log calculation when lineIndex or zoom changes
        if (shouldLog) {
            console.log(`[SCROLL DEBUG] Calculated scroll position:`, {
                lineIndex: lineIndex,
                estimatedTopPosition: estimatedTopPosition,
                preferredScroll: preferredScroll,
                advanceLines: advanceLines,
                isBlockAdvance: advanceLines >= this.LINES_PER_BLOCK,
                isCommitMode: isCommitMode,
                anchorRatio: anchorRatio
            });
        }
        
        return preferredScroll;
    }
    
    isCommitMode(currentLineIndex, advanceLines) {
        // Commit mode triggers when we're confident we're progressing:
        // 1. Current line index is beyond threshold (>= 10 lines in)
        // 2. Progress is beyond percentage threshold (> 25% of song)
        // 3. We advanced a block (4+ lines)
        // 4. High confidence is stable (>90% for multiple detections)
        
        const progressPercent = ((currentLineIndex + 1) / this.lyrics.length) * 100;
        const isFarIntoSong = currentLineIndex >= 10 || progressPercent > 25;
        const isBlockAdvance = advanceLines >= this.LINES_PER_BLOCK;
        
        // Check for high confidence stability
        const recentHighConfidence = this.candidateHistory.filter(c => 
            c.confidence > 0.9 && (Date.now() - c.timestamp) < 5000
        ).length >= 2;
        
        return isFarIntoSong || isBlockAdvance || recentHighConfidence;
    }

    getLineStartPosition(lineIndex) {
        const lines = this.lyricsText.split('\n');
        let position = 0;
        for (let i = 0; i < lineIndex; i++) {
            position += lines[i].length + 1; // +1 for newline
        }
        return position;
    }

    getLineEndPosition(lineIndex) {
        const lines = this.lyricsText.split('\n');
        let position = 0;
        for (let i = 0; i <= lineIndex; i++) {
            position += lines[i].length + 1; // +1 for newline
        }
        return position;
    }

    setupEventListeners() {
        this.startMicBtn.addEventListener('click', () => this.startListening());
        this.stopMicBtn.addEventListener('click', () => this.stopListening());
        
        // Zoom controls (optional, may not exist in new UI)
        if (this.zoomInBtn) {
            this.zoomInBtn.addEventListener('click', () => this.zoomIn());
        }
        if (this.zoomOutBtn) {
            this.zoomOutBtn.addEventListener('click', () => this.zoomOut());
        }
        if (this.zoomResetBtn) {
            this.zoomResetBtn.addEventListener('click', () => this.zoomReset());
        }
        
        // Bold button (optional, for new iOS-style UI)
        if (this.boldBtn) {
            this.boldBtn.addEventListener('click', () => {
                this.lyricsTextEl.classList.toggle('bold');
                this.boldBtn.classList.toggle('active');
            });
        }
        
        // Pinch-to-zoom gesture handler
        this.setupPinchToZoom();
    }
    
    setupPinchToZoom() {
        const scrollContainer = this.getScrollContainer();
        if (!scrollContainer) return;
        
        let touches = [];
        
        const getDistance = (touch1, touch2) => {
            const dx = touch2.clientX - touch1.clientX;
            const dy = touch2.clientY - touch1.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };
        
        scrollContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                this.isPinching = true;
                this.initialZoomLevel = this.zoomLevel;
                touches = Array.from(e.touches);
                this.initialPinchDistance = getDistance(touches[0], touches[1]);
            }
        }, { passive: false });
        
        scrollContainer.addEventListener('touchmove', (e) => {
            if (this.isPinching && e.touches.length === 2) {
                e.preventDefault();
                touches = Array.from(e.touches);
                const currentDistance = getDistance(touches[0], touches[1]);
                
                if (this.initialPinchDistance > 0) {
                    // Calculate scale offset (similar to usePinch hook)
                    const scaleOffset = currentDistance / this.initialPinchDistance;
                    
                    // Apply scale bounds (0.5 to 3.0 like production)
                    const newZoomLevel = Math.max(0.5, Math.min(3.0, this.initialZoomLevel * scaleOffset));
                    this.zoomLevel = newZoomLevel;
                    this.applyZoom();
                }
            }
        }, { passive: false });
        
        scrollContainer.addEventListener('touchend', (e) => {
            if (this.isPinching && e.touches.length < 2) {
                this.isPinching = false;
                this.initialPinchDistance = 0;
            }
        }, { passive: false });
        
        scrollContainer.addEventListener('touchcancel', () => {
            this.isPinching = false;
            this.initialPinchDistance = 0;
        }, { passive: false });
    }
    
    zoomIn() {
        this.zoomLevel = Math.min(this.zoomLevel + 0.1, 3); // Max 300%
        this.applyZoom();
    }
    
    zoomOut() {
        this.zoomLevel = Math.max(this.zoomLevel - 0.1, 0.5); // Min 50%
        this.applyZoom();
    }
    
    zoomReset() {
        this.zoomLevel = 1;
        this.applyZoom();
    }
    
    applyZoom() {
        // Apply zoom using font-size so getVisibleLinesCount() detects the change
        if (this.baseFontSize === null) {
            const computedStyle = window.getComputedStyle(this.lyricsTextEl);
            this.baseFontSize = parseFloat(computedStyle.fontSize);
        }
        // Use baseZoomLevel (18px) as the base, matching production behavior
        // Clamp font size to 12-48px like production (0.5-3.0 scale = 9-54px, clamped to 12-48px)
        const calculatedFontSize = this.baseZoomLevel * this.zoomLevel;
        const newFontSize = Math.max(12, Math.min(48, calculatedFontSize));
        this.lyricsTextEl.style.fontSize = `${newFontSize}px`;
        
        // Update zoom level display (if element exists)
        if (this.zoomLevelEl) {
            this.zoomLevelEl.textContent = `${Math.round(this.zoomLevel * 100)}%`;
        }
        
        // Trigger scroll update when zoom changes (event-driven)
        // Pass null for previousLineIndex since zoom change doesn't change lineIndex
        if (this.targetLineIndex !== null) {
            this.updateScrollToTarget(null);
        }
    }

    async startListening() {
        try {
            // Request microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });

            // Set up audio analysis for level monitoring
            this.setupAudioAnalysis();

            // Initialize Web Speech API for speech recognition
            this.initializeSpeechRecognition();

            // Update UI
            this.isListening = true;
            this.startMicBtn.disabled = true;
            this.stopMicBtn.disabled = false;
            if (this.micStatus) {
                this.micStatus.textContent = 'Microphone: On';
                this.micStatus.style.color = '#28a745';
            }
            if (this.micStatusEl) {
                this.micStatusEl.textContent = 'On';
            }
            
            // Reset progress when starting
            this.currentLineIndex = 0;
            this.progressPercent = 0;
            this.targetLineIndex = null;
            this.candidateHistory = [];
            this.lastAdvanceTimestamp = null;
            this.highConfidenceCount = 0;
            const containerWrapper = this.getScrollContainer();
            this.lastScrollPosition = containerWrapper.scrollTop; // Initialize from current position
            this.updateProgressOverlay();

            console.log('Microphone access granted and listening started');
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Failed to access microphone. Please check permissions.');
            if (this.micStatus) {
                this.micStatus.textContent = 'Microphone: Error';
                this.micStatus.style.color = '#dc3545';
            }
            if (this.micStatusEl) {
                this.micStatusEl.textContent = 'Error';
            }
        }
    }

    setupAudioAnalysis() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        source.connect(this.analyser);

        // Monitor audio levels
        this.monitorAudioLevel();
    }

    monitorAudioLevel() {
        if (!this.analyser) return;

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateLevel = () => {
            if (!this.isListening) return;

            this.analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((sum, val) => sum + val, 0) / bufferLength;
            this.audioLevel = Math.round(average);
            this.audioLevelEl.textContent = `${this.audioLevel}%`;

            requestAnimationFrame(updateLevel);
        };

        updateLevel();
    }

    initializeSpeechRecognition() {
        // Check if browser supports Web Speech API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('Web Speech API not supported. Using fallback text matching.');
            if (this.recognitionStatus) {
                this.recognitionStatus.textContent = 'Recognition: Not Supported (Using Fallback)';
                this.recognitionStatus.style.color = '#ffc107';
            }
            if (this.recognitionStatusEl) {
                this.recognitionStatusEl.textContent = 'Not Supported';
            }
            // Fallback: Use audio level-based scrolling (simpler approach)
            this.startFallbackScrolling();
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'es-MX'; // Mexican Spanish

        this.recognition.onstart = () => {
            if (this.recognitionStatus) {
                this.recognitionStatus.textContent = 'Recognition: Active';
                this.recognitionStatus.style.color = '#28a745';
            }
            if (this.recognitionStatusEl) {
                this.recognitionStatusEl.textContent = 'Active';
            }
            console.log('Speech recognition started');
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            // Update recognized text display
            const displayText = finalTranscript || interimTranscript;
            this.recognizedTextEl.textContent = displayText.trim() || '-';

            // Process final results for lyric matching (higher priority)
            if (finalTranscript) {
                this.processRecognizedText(finalTranscript, false);
                // Start continuous scrolling if lyrics are detected and scrolling isn't already running
                if (!this.scrollAnimationId && this.isListening && this.targetLineIndex !== null) {
                    this.startContinuousScrolling();
                }
            }
            // Also process interim results for faster response (lower confidence threshold)
            else if (interimTranscript && interimTranscript.trim().length > 0) {
                this.processRecognizedText(interimTranscript, true);
                // Start continuous scrolling if lyrics are detected and scrolling isn't already running
                if (!this.scrollAnimationId && this.isListening && this.targetLineIndex !== null) {
                    this.startContinuousScrolling();
                }
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (this.recognitionStatus) {
                this.recognitionStatus.textContent = `Recognition: Error (${event.error})`;
                this.recognitionStatus.style.color = '#dc3545';
            }
            if (this.recognitionStatusEl) {
                this.recognitionStatusEl.textContent = `Error: ${event.error}`;
            }
        };

        this.recognition.onend = () => {
            if (this.isListening) {
                // Restart recognition if still listening
                try {
                    this.recognition.start();
                } catch (e) {
                    console.error('Error restarting recognition:', e);
                }
            }
        };

        // Start recognition
        try {
            this.recognition.start();
        } catch (e) {
            console.error('Error starting recognition:', e);
        }
    }

    getVisibleLinesCount() {
        // Calculate how many lines are actually visible in the viewport
        const containerWrapper = this.getScrollContainer();
        const lyricsTextEl = this.lyricsTextEl;
        
        // Get computed styles to determine line height
        const computedStyle = window.getComputedStyle(lyricsTextEl);
        const fontSize = parseFloat(computedStyle.fontSize);
        const lineHeight = parseFloat(computedStyle.lineHeight) || fontSize * 1.8; // fallback to 1.8 if not set
        
        // Calculate visible viewport height
        const viewportHeight = containerWrapper.clientHeight;
        
        // Calculate how many lines fit in the viewport
        const visibleLines = Math.ceil(viewportHeight / lineHeight);
        
        // Return at least 3 lines minimum, and multiply by 2 to look ahead beyond visible area
        return Math.max(3, Math.floor(visibleLines * 2));
    }

    processRecognizedText(text, isInterim = false) {
        // Use Spanish normalization for better matching
        const normalizedText = this.normalizeSpanish(text);
        
        // Search for matching lyrics with sequence-aware constraints
        const resolvedIndex = this.resolveLineIndex(normalizedText, isInterim);
        
        if (resolvedIndex !== null && resolvedIndex >= 0) {
            const confidence = this.calculateMatchConfidence(normalizedText, this.normalizeSpanish(this.lyrics[resolvedIndex].text));
            this.matchConfidenceEl.textContent = `${Math.round(confidence * 100)}%${isInterim ? ' (interim)' : ''}`;
            
            const confidenceThreshold = isInterim ? 0.45 : 0.5;
            if (confidence > confidenceThreshold && resolvedIndex >= this.currentLineIndex) {
                console.log(`[SCROLL DEBUG] processRecognizedText: Calling scrollToLine(${resolvedIndex})`);
                this.scrollToLine(resolvedIndex);
                if (!this.scrollAnimationId && this.isListening) {
                    this.startContinuousScrolling();
                }
            } else {
                console.log(`[SCROLL DEBUG] processRecognizedText: Not scrolling (confidence: ${confidence.toFixed(2)}, threshold: ${confidenceThreshold}, resolvedIndex: ${resolvedIndex}, currentLineIndex: ${this.currentLineIndex})`);
            }
        } else {
            this.matchConfidenceEl.textContent = 'No match';
        }
    }

    resolveLineIndex(normalizedText, isInterim = false) {
        const now = Date.now();
        const minIndex = this.currentLineIndex;
        const maxIndex = Math.min(this.currentLineIndex + this.WINDOW_FORWARD, this.lyrics.length - 1);
        
        // Search all lines to find all potential matches with confidence scores
        const candidates = [];
        for (let i = 0; i < this.lyrics.length; i++) {
            const lyricText = this.normalizeSpanish(this.lyrics[i].text);
            const confidence = this.calculateMatchConfidence(normalizedText, lyricText);
            const minThreshold = isInterim ? 0.25 : 0.3;
            
            if (confidence > minThreshold) {
                const distance = i - this.currentLineIndex;
                // Apply distance penalty for repeated phrases (lines far ahead get penalized)
                const distancePenalty = distance > 0 ? distance * this.DISTANCE_PENALTY_FACTOR : 0;
                const adjustedScore = confidence - distancePenalty;
                
                candidates.push({
                    index: i,
                    confidence: confidence,
                    adjustedScore: adjustedScore,
                    distance: distance
                });
            }
        }
        
        if (candidates.length === 0) return null;
        
        // Sort by adjusted score (best first)
        candidates.sort((a, b) => b.adjustedScore - a.adjustedScore);
        
        // Prefer candidates in the forward window
        const localCandidates = candidates.filter(c => c.index >= minIndex && c.index <= maxIndex);
        const bestLocal = localCandidates.length > 0 ? localCandidates[0] : null;
        const bestGlobal = candidates[0];
        
        // If best match is in local window, use it
        if (bestLocal && bestLocal.index <= maxIndex) {
            const acceptedIndex = this.evaluateCandidate(bestLocal.index, bestLocal.confidence, now);
            if (acceptedIndex !== null) {
                return acceptedIndex;
            }
        }
        
        // If best match is far ahead, check evidence gate
        if (bestGlobal.index > this.currentLineIndex + this.EVIDENCE_GATE_JUMP_THRESHOLD) {
            if (this.passesEvidenceGate(bestGlobal.index, now)) {
                const acceptedIndex = this.evaluateCandidate(bestGlobal.index, bestGlobal.confidence, now);
                if (acceptedIndex !== null) {
                    return acceptedIndex;
                }
            }
            // Evidence gate failed - use best local match instead
            if (bestLocal) {
                return this.evaluateCandidate(bestLocal.index, bestLocal.confidence, now);
            }
            // No local match, don't jump
            return null;
        }
        
        // Moderate jump - allow if forward and confidence is good
        if (bestGlobal.index > this.currentLineIndex && bestGlobal.index <= this.currentLineIndex + this.EVIDENCE_GATE_JUMP_THRESHOLD) {
            return this.evaluateCandidate(bestGlobal.index, bestGlobal.confidence, now);
        }
        
        // Best match is backward or same - reject (never scroll up)
        if (bestLocal) {
            return this.evaluateCandidate(bestLocal.index, bestLocal.confidence, now);
        }
        
        return null;
    }

    passesEvidenceGate(jumpIndex, timestamp) {
        // Check if we have recent consecutive detections that support this jump
        const recentCandidates = this.candidateHistory.filter(c => 
            timestamp - c.timestamp <= this.EVIDENCE_TIME_WINDOW_MS
        );
        
        if (recentCandidates.length === 0) return false;
        
        // Check for sequential consistency - look for trend toward jumpIndex
        const indices = recentCandidates.map(c => c.index).sort((a, b) => a - b);
        const jumpDistance = jumpIndex - this.currentLineIndex;
        const expectedRangeStart = jumpIndex - jumpDistance / 2;
        const expectedRangeEnd = jumpIndex;
        
        // Count candidates in expected range leading to jump
        const supportingCandidates = indices.filter(idx => 
            idx >= expectedRangeStart && idx <= expectedRangeEnd
        );
        
        // Need at least EVIDENCE_CONSECUTIVE_LINES supporting detections
        if (supportingCandidates.length >= this.EVIDENCE_CONSECUTIVE_LINES) {
            // Check if they form a sequence trending upward
            let consecutiveCount = 0;
            for (let i = 0; i < supportingCandidates.length - 1; i++) {
                if (supportingCandidates[i + 1] >= supportingCandidates[i]) {
                    consecutiveCount++;
                }
            }
            if (consecutiveCount >= this.EVIDENCE_CONSECUTIVE_LINES - 1) {
                return true;
            }
        }
        
        return false;
    }

    evaluateCandidate(candidateIndex, confidence, timestamp) {
        // Never allow backward movement
        if (candidateIndex < this.currentLineIndex) {
            return null;
        }
        
        // Add to candidate history
        this.candidateHistory.push({
            index: candidateIndex,
            confidence: confidence,
            timestamp: timestamp
        });
        
        // Keep only recent history (last 5 seconds)
        const cutoffTime = timestamp - this.EVIDENCE_TIME_WINDOW_MS;
        this.candidateHistory = this.candidateHistory.filter(c => c.timestamp > cutoffTime);
        
        // Update timestamp if we're advancing
        if (candidateIndex > this.currentLineIndex) {
            this.lastAdvanceTimestamp = timestamp;
        }
        
        return candidateIndex;
    }

    normalizeSpanish(text) {
        // Normalize Spanish text by removing accents and converting to lowercase
        // This helps with matching when speech recognition doesn't include accents
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .trim();
    }

    calculateMatchConfidence(recognized, lyric) {
        // Improved word-based matching algorithm for Spanish
        // Handles accents and common variations
        
        // Normalize both texts (remove accents, lowercase)
        const normalizedRecognized = this.normalizeSpanish(recognized);
        const normalizedLyric = this.normalizeSpanish(lyric);
        
        // Filter out very short words (Spanish articles, prepositions, etc.)
        const recognizedWords = normalizedRecognized.split(/\s+/).filter(w => w.length > 1);
        const lyricWords = normalizedLyric.split(/\s+/).filter(w => w.length > 1);
        
        if (recognizedWords.length === 0 || lyricWords.length === 0) {
            return 0;
        }

        // Count matching words (with fuzzy matching for Spanish variations)
        let matches = 0;
        for (const word of recognizedWords) {
            const found = lyricWords.some(lw => {
                // Exact match
                if (lw === word) return true;
                // Substring match (handles partial words)
                if (lw.includes(word) || word.includes(lw)) return true;
                // Handle common Spanish variations (e.g., "pa'" vs "para")
                if ((word === 'pa' && lw === 'para') || (word === 'para' && lw === 'pa')) return true;
                return false;
            });
            if (found) matches++;
        }

        // Calculate confidence based on word matches
        const wordMatchRatio = matches / Math.max(recognizedWords.length, lyricWords.length);
        
        // Check for substring matches (for partial recognition)
        const substringMatch = normalizedLyric.includes(normalizedRecognized) || 
                              normalizedRecognized.includes(normalizedLyric);
        const substringBonus = substringMatch ? 0.25 : 0;
        
        // Bonus for matching key words (longer words are more significant)
        const keyWordBonus = recognizedWords.filter(w => w.length > 4 && 
            lyricWords.some(lw => lw.includes(w) || w.includes(lw))).length * 0.1;

        return Math.min(1, wordMatchRatio + substringBonus + keyWordBonus);
    }

    scrollToLine(lineIndex) {
        if (lineIndex < 0 || lineIndex >= this.lyrics.length) {
            return;
        }

        // Capture previous line index BEFORE updating currentLineIndex (for block advance calculation)
        const previousLineIndex = this.currentLineIndex;
        const lineIndexChanged = lineIndex !== this.currentLineIndex;
        const advanceLines = lineIndex > previousLineIndex ? lineIndex - previousLineIndex : 0;
        
        if (lineIndex > this.currentLineIndex) {
            this.currentLineIndex = lineIndex;
            if (lineIndexChanged) {
                console.log(`[SCROLL DEBUG] scrollToLine(${lineIndex}): Updated currentLineIndex ${previousLineIndex} -> ${this.currentLineIndex}, advanceLines: ${advanceLines}`);
            }
        } else if (lineIndex < this.currentLineIndex) {
            // Still update target for display purposes, but don't scroll
            this.targetLineIndex = lineIndex;
            return;
        }

        // Only proceed with scroll update if lineIndex actually changed
        if (!lineIndexChanged && this.targetLineIndex === lineIndex) {
            // No change, skip scroll update
            return;
        }

        // Calculate progress percentage based on current line
        this.progressPercent = ((this.currentLineIndex + 1) / this.lyrics.length) * 100;
        
        // Update the red opacity overlay to show progress
        this.updateProgressOverlay();

        // Set target line and trigger scroll update
        if (lineIndex >= this.currentLineIndex) {
            this.targetLineIndex = lineIndex;
            if (lineIndexChanged) {
                console.log(`[SCROLL DEBUG] Set targetLineIndex to ${this.targetLineIndex}, triggering scroll update`);
            }
            
            // Event-driven scroll update (only when lineIndex changes)
            // Pass previousLineIndex so block advance logic can use correct advance calculation
            this.updateScrollToTarget(previousLineIndex);
        }

        // Update debug info
        this.currentLineEl.textContent = `${this.currentLineIndex + 1} / ${this.lyrics.length}: "${this.lyrics[this.currentLineIndex].text.substring(0, 50)}..."`;

        if (lineIndexChanged) {
            console.log(`Progress: ${Math.round(this.progressPercent)}% - Line ${this.currentLineIndex + 1}: ${this.lyrics[this.currentLineIndex].text}`);
        }
    }
    
    updateScrollToTarget(previousLineIndex = null) {
        // Event-driven scroll update - only compute and apply when needed
        if (this.targetLineIndex === null) {
            this.stopContinuousScrolling();
            return;
        }
        
        const containerWrapper = this.getScrollContainer();
        const currentScroll = containerWrapper.scrollTop;
        const maxScroll = containerWrapper.scrollHeight - containerWrapper.clientHeight;
        
        if (maxScroll <= 0) {
            return;
        }
        
        // Calculate target scroll position, passing previousLineIndex for correct block advance calculation
        const targetScroll = this.getLineScrollPosition(this.targetLineIndex, previousLineIndex);
        const safeTargetScroll = Math.max(0, Math.min(targetScroll, maxScroll));
        
        // Tolerance check: if already at target (within 1px), no-op
        const scrollDiff = Math.abs(safeTargetScroll - currentScroll);
        if (scrollDiff < 1) {
            // Already at target, stop animation
            this.stopContinuousScrolling();
            return;
        }
        
        // Only scroll forward (never scroll up)
        const desiredScroll = Math.max(safeTargetScroll, this.lastScrollPosition);
        const finalScroll = Math.min(desiredScroll, maxScroll);
        
        // Check if we actually need to scroll
        if (Math.abs(finalScroll - currentScroll) < 1) {
            this.stopContinuousScrolling();
            return;
        }
        
        // Start animation only if we need to scroll
        if (!this.scrollAnimationId && this.isListening) {
            this.startContinuousScrolling();
        }
    }

    updateProgressOverlay() {
        // Calculate the height of the overlay based on progress
        const containerWrapper = this.getScrollContainer();
        const containerHeight = containerWrapper.scrollHeight;
        const overlayHeight = (this.progressPercent / 100) * containerHeight;
        this.progressOverlay.style.height = `${overlayHeight}px`;
    }

    startContinuousScrolling() {
        // Start continuous smooth scrolling animation (only when needed)
        if (this.scrollAnimationId) {
            return; // Already running
        }
        
        const containerWrapper = this.getScrollContainer();
        let lastTime = performance.now();
        
        const animateScroll = (currentTime) => {
            if (!this.isListening) {
                // Stop scrolling if listening stopped
                this.stopContinuousScrolling();
                return;
            }
            
            // Get current scroll position
            const currentScroll = containerWrapper.scrollTop;
            const maxScroll = containerWrapper.scrollHeight - containerWrapper.clientHeight;
            
            // Ensure maxScroll is valid (not negative or zero)
            if (maxScroll <= 0) {
                this.stopContinuousScrolling();
                return;
            }
            
            // If we have a target line, calculate target scroll position
            // Note: In animation loop, previousLineIndex is not available, so block advance won't apply
            // Block advance is handled in updateScrollToTarget() when lineIndex changes
            let targetScroll = null;
            if (this.targetLineIndex !== null) {
                targetScroll = this.getLineScrollPosition(this.targetLineIndex, null);
                targetScroll = Math.min(Math.max(0, targetScroll), maxScroll);
            }
            
            // Tolerance check: if at target (within 1px), stop animation
            if (targetScroll !== null) {
                const scrollDiff = Math.abs(targetScroll - currentScroll);
                if (scrollDiff < 1) {
                    // Reached target, stop animation
                    this.stopContinuousScrolling();
                    return;
                }
            } else {
                // No target, stop animation
                this.stopContinuousScrolling();
                return;
            }
            
            // Ensure monotonic increase - never scroll backward
            const safeCurrentScroll = Math.max(currentScroll, this.lastScrollPosition);
            
            // Only scroll if target is ahead
            if (targetScroll <= safeCurrentScroll) {
                // Target behind or at current, stop animation
                this.stopContinuousScrolling();
                return;
            }
            
            // Calculate scroll animation
            const deltaTime = Math.min(currentTime - lastTime, 33.33);
            lastTime = currentTime;
            
            const distance = targetScroll - safeCurrentScroll;
            
            // Calculate adaptive speed: faster when far away, slower when close
            let scrollSpeed;
            if (distance > this.closeDistanceThreshold) {
                const speedFactor = Math.min(1, (distance - this.closeDistanceThreshold) / 300);
                scrollSpeed = this.scrollBaselineSpeed + (this.scrollMaxSpeed - this.scrollBaselineSpeed) * speedFactor;
            } else {
                scrollSpeed = this.scrollBaselineSpeed;
            }
            
            // Calculate next scroll position
            const scrollDelta = scrollSpeed * (deltaTime / 16.67);
            let newScroll = safeCurrentScroll + scrollDelta;
            
            // Don't overshoot the target
            if (newScroll >= targetScroll) {
                newScroll = targetScroll;
            }
            
            // Ensure monotonic increase and don't exceed max scroll
            newScroll = Math.max(newScroll, this.lastScrollPosition);
            newScroll = Math.min(newScroll, maxScroll);
            
            // Only update scroll if position actually changed (prevents unnecessary repaints)
            const previousScroll = containerWrapper.scrollTop;
            if (Math.abs(previousScroll - newScroll) > 0.5) {
                containerWrapper.scrollTop = newScroll;
                this.lastScrollPosition = newScroll;
                
                // Only log when scrollTop actually changes
                if (this.lastLoggedScrollTop === null || Math.abs(this.lastLoggedScrollTop - newScroll) > 1) {
                    this.lastLoggedScrollTop = newScroll;
                    console.log(`[SCROLL DEBUG] Scroll updated:`, {
                        previousScrollTop: previousScroll,
                        newScrollTop: newScroll,
                        delta: newScroll - previousScroll,
                        targetLineIndex: this.targetLineIndex,
                        zoomLevel: this.zoomLevel
                    });
                }
            }
            
            // Continue animation
            this.scrollAnimationId = requestAnimationFrame(animateScroll);
        };
        
        // Start the animation
        this.scrollAnimationId = requestAnimationFrame(animateScroll);
    }
    
    stopContinuousScrolling() {
        if (this.scrollAnimationId) {
            cancelAnimationFrame(this.scrollAnimationId);
            this.scrollAnimationId = null;
        }
    }

    startFallbackScrolling() {
        // Fallback: Use audio level and timing for basic auto-scroll
        // This is a simple approach when speech recognition isn't available
        let lastScrollTime = Date.now();
        const scrollInterval = 3000; // Scroll every 3 seconds if audio is detected

        const fallbackInterval = setInterval(() => {
            if (!this.isListening) {
                clearInterval(fallbackInterval);
                this.stopContinuousScrolling();
                return;
            }

            // If there's significant audio activity, advance to next line
            if (this.audioLevel > 20 && Date.now() - lastScrollTime > scrollInterval) {
                if (this.currentLineIndex < this.lyrics.length - 1) {
                    this.scrollToLine(this.currentLineIndex + 1);
                    lastScrollTime = Date.now();
                    // Start continuous scrolling if not already running
                    if (!this.scrollAnimationId && this.isListening) {
                        this.startContinuousScrolling();
                    }
                }
            }
        }, 500);
    }

    stopListening() {
        this.isListening = false;

        // Stop continuous scrolling
        this.stopContinuousScrolling();

        // Stop speech recognition
        if (this.recognition) {
            this.recognition.stop();
            this.recognition = null;
        }

        // Stop audio stream
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        // Close audio context
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
            this.analyser = null;
        }

        // Reset progress overlay
        this.progressPercent = 0;
        this.targetLineIndex = null;
        this.updateProgressOverlay();

        // Update UI
        this.startMicBtn.disabled = false;
        this.stopMicBtn.disabled = true;
        if (this.micStatus) {
            this.micStatus.textContent = 'Microphone: Off';
            this.micStatus.style.color = '#6c757d';
        }
        if (this.micStatusEl) {
            this.micStatusEl.textContent = 'Off';
        }
        if (this.recognitionStatus) {
            this.recognitionStatus.textContent = 'Recognition: Idle';
            this.recognitionStatus.style.color = '#6c757d';
        }
        if (this.recognitionStatusEl) {
            this.recognitionStatusEl.textContent = 'Idle';
        }
        if (this.audioLevelEl) {
            this.audioLevelEl.textContent = '-';
        }

        console.log('Listening stopped');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new MicAutoScroll();
    console.log('Mic Auto-Scroll Test Application initialized');
    
    // Update progress overlay on window resize
    window.addEventListener('resize', () => {
        if (app.progressOverlay) {
            app.updateProgressOverlay();
        }
    });
});

