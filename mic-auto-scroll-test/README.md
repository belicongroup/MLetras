# Mic Auto-Scroll Test Environment

This is a **completely separate test environment** for prototyping automatic lyric scrolling based on microphone input. This folder is isolated from the main project and can be safely experimented with.

## Overview

This prototype tests the logic for:
- Listening to microphone input (user singing/speaking)
- Recognizing speech/audio patterns
- Matching recognized audio to lyrics
- Automatically scrolling lyrics to match the current position

**Currently configured for Mexican Spanish (es-MX) language recognition** with Spanish lyrics included.

## Features

- **Microphone Access**: Requests and manages microphone permissions
- **Speech Recognition**: Uses Web Speech API for real-time speech-to-text
- **Audio Analysis**: Monitors audio levels for fallback scrolling
- **Lyric Matching**: Simple word-based matching algorithm (can be improved)
- **Auto-Scrolling**: Smoothly scrolls to the matching lyric line
- **Visual Feedback**: Highlights active line and shows debug information

## Setup

1. **Open the test file**: Simply open `index.html` in a modern web browser
   - Chrome/Edge: Best support for Web Speech API
   - Firefox: Limited support
   - Safari: Limited support

2. **HTTPS Required**: For microphone access, you may need to serve this over HTTPS or use `localhost`
   - Option 1: Use a simple HTTP server:
     ```bash
     # Python 3
     python -m http.server 8000
     
     # Node.js (if you have http-server installed)
     npx http-server
     ```
   - Option 2: Open directly in Chrome/Edge (may work for local files)

3. **Grant Permissions**: When you click "Start Microphone", the browser will ask for microphone permission

## Usage

1. Click **"Start Microphone"** button
2. Start singing or speaking the lyrics
3. Watch as the app:
   - Recognizes your speech
   - Matches it to lyrics
   - Automatically scrolls to the matching line

## How It Works

### Speech Recognition Flow
1. **Microphone Access**: Requests audio stream from user's device
2. **Speech Recognition**: Uses Web Speech API to convert audio to text
3. **Text Matching**: Compares recognized text with lyric lines
4. **Confidence Scoring**: Calculates match confidence using word similarity
5. **Auto-Scroll**: Scrolls to the best matching line when confidence > 50%

### Matching Algorithm

Uses an improved word-based matching optimized for Spanish:
- **Spanish normalization**: Removes accents (á → a, é → e, etc.) for better matching
- Normalizes text (lowercase, trim)
- Splits into words (filters very short words)
- Counts matching words between recognized text and lyrics
- Handles Spanish variations (e.g., "pa'" vs "para")
- Calculates confidence ratio with bonuses for:
  - Substring matches
  - Key word matches (longer words weighted more)
- Includes substring matching bonus

**This can be improved with:**
- Fuzzy string matching (Levenshtein distance)
- Phonetic matching (for singing vs speaking)
- Machine learning models
- Timing-based synchronization

### Fallback Mode

If Web Speech API is not available, the app falls back to:
- Audio level monitoring
- Time-based auto-scroll (advances every 3 seconds if audio detected)

## Customization

### Change Lyrics

Edit the lyrics in `index.html`:
```html
<div class="lyric-line" data-line="0">Your lyric here</div>
```

### Adjust Matching Sensitivity

In `app.js`, modify the confidence threshold:
```javascript
if (bestConfidence > 0.5 && bestMatchIndex >= this.currentLineIndex) {
    // Change 0.5 to adjust sensitivity (0.0 - 1.0)
}
```

### Change Language

The app is currently configured for **Mexican Spanish (es-MX)**. To change the language, modify in `app.js`:
```javascript
this.recognition.lang = 'es-ES'; // For Spanish (Spain)
// or
this.recognition.lang = 'en-US'; // For English
```

## Browser Compatibility

| Browser | Web Speech API | Microphone Access |
|---------|---------------|-------------------|
| Chrome/Edge | ✅ Full Support | ✅ Yes |
| Firefox | ❌ Not Supported | ✅ Yes |
| Safari | ⚠️ Limited | ✅ Yes |

## Next Steps for Improvement

1. **Better Matching Algorithm**:
   - Implement fuzzy string matching
   - Add phonetic similarity (for singing)
   - Use timing information

2. **Audio Processing**:
   - Pitch detection
   - Beat/tempo matching
   - Audio fingerprinting

3. **Machine Learning**:
   - Train a model for lyric-audio matching
   - Use pre-trained speech models
   - Implement keyword spotting

4. **Timing Synchronization**:
   - Sync with actual song playback
   - Use timestamps from lyrics
   - Implement offset compensation

## Notes

- This is a **prototype/test environment** - not production code
- No dependencies required - pure HTML/CSS/JavaScript
- All code is self-contained in this folder
- Safe to experiment - won't affect main project

## Troubleshooting

**Microphone not working?**
- Check browser permissions
- Ensure HTTPS or localhost
- Try a different browser (Chrome recommended)

**Speech recognition not working?**
- Check browser compatibility
- Verify microphone is working
- Check console for errors

**Not scrolling correctly?**
- Adjust confidence threshold
- Check debug panel for match confidence
- Try speaking more clearly

