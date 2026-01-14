# iOS Keyboard "Done" Dismissal Bug - Search Bar Fix

## Summary

Fixed a bug where tapping the "Done" button on the iOS keyboard for the song search bar would cause the keyboard to dismiss briefly, then immediately reopen. The keyboard would only stay dismissed when using the "Next" button instead of "Done".

## Root Cause

The bug was caused by an overly aggressive refocus mechanism in the `onBlur` handler of the search input. The handler was designed to prevent accidental blur events on iOS by automatically refocusing the input when `allowBlurRef.current` was `false`. 

When the user tapped "Done" on the iOS keyboard:
1. The keyboard dismissal triggered a `blur` event on the input
2. The `onBlur` handler checked if `allowBlurRef.current` was `false` (which it was by default)
3. Since it was `false` and we're on iOS, the handler automatically refocused the input
4. This caused the keyboard to immediately reappear

The `allowBlurRef` flag was only being set to `true` when:
- The Enter key was pressed (`onKeyPress` handler)
- The clear/search button was clicked (`onClick` handler)

However, tapping "Done" on the iOS keyboard doesn't trigger these handlers - it goes directly to the `blur` event, so the refocus logic incorrectly kicked in.

## Files Changed

- `/Users/Belicongroup/Desktop/MLetras/src/components/SearchPage.tsx`

## What Was Changed

1. **Wrapped the input in a `<form>` element** (lines ~495-576):
   - Added a form wrapper around the search input
   - Added an `onSubmit` handler that:
     - Prevents default form submission behavior
     - Sets `allowBlurRef.current = true` to allow blur
     - Executes the search
     - Blurs the input
   - This handles the case where iOS treats "Done" as a form submission

2. **Enhanced the `onBlur` handler** (lines ~535-567):
   - Changed the handler signature to receive the blur event: `onBlur={(e) => {...}}`
   - Added detection for intentional keyboard dismissal:
     - Checks `e.relatedTarget` to see where focus is moving
     - Checks `document.activeElement` to see the current focus target
     - Detects if blurring to body/document (indicating intentional dismissal like "Done")
   - Updated logic to:
     - If blurring to body/document → treat as intentional dismissal and allow blur
     - If blurring to another interactive element → treat as accidental and refocus
     - Only refocus when it's clearly an accidental blur

3. **Removed invalid `rows` prop** (line ~575):
   - Removed `rows={1}` prop which is only valid for `<textarea>` elements, not `<input>`
   - Fixed TypeScript linting error

## How to Test / Verify

1. **Setup**:
   - Deploy the app to an iOS device or iOS Simulator
   - Navigate to the search page/screen (the one with the song search bar)

2. **Test "Done" button dismissal**:
   - Tap into the search input field → keyboard should appear
   - Tap the "Done" button (top-right of iOS keyboard)
   - **Expected**: Keyboard dismisses and stays dismissed
   - **Previously**: Keyboard would dismiss for a split second then reopen

3. **Test "Next" button (should still work)**:
   - Tap into the search input field → keyboard appears
   - Tap the "Next" button (if available)
   - **Expected**: Keyboard dismisses and stays dismissed (this was already working)

4. **Test Enter key (should still work)**:
   - Type some text in the search input
   - Press Enter/Return
   - **Expected**: Search executes and keyboard dismisses (this was already working)

5. **Test accidental blur prevention (should still work)**:
   - Tap into the search input field → keyboard appears
   - Tap somewhere else on the page that shouldn't trigger a blur
   - **Expected**: Input should maintain focus (the refocus protection should still work for accidental blurs)

6. **Compare with other inputs**:
   - Test Notes creation/editing inputs → should still dismiss correctly (unchanged)
   - Test Bookmarks folder naming inputs → should still dismiss correctly (unchanged)

## How to Revert

To revert this fix, you would need to:

1. **Remove the form wrapper** (lines ~495-576):
   - Change the opening `<div className="relative">` back to just contain the Input directly
   - Remove the `<form onSubmit={...}>` wrapper and its closing `</form>` tag
   - Move the `onSubmit` logic back to the `onKeyPress` handler if needed

2. **Revert the `onBlur` handler** (lines ~535-567):
   - Change `onBlur={(e) => {...}}` back to `onBlur={() => {...}}`
   - Remove the `relatedTarget` and `activeElement` detection logic
   - Restore the original simple check:
     ```typescript
     onBlur={() => {
       emitDebugLog(
         `input blur (allowBlur=${allowBlurRef.current}, isIOS=${isIOSApp}, activeElement=${document.activeElement?.tagName})`,
       );
       if (isIOSApp && !allowBlurRef.current) {
         requestAnimationFrame(() => {
           isProgrammaticFocus.current = true;
           searchInputRef.current?.focus();
           emitDebugLog("refocusing input after unexpected blur");
         });
       } else {
         allowBlurRef.current = false;
         emitDebugLog("blur permitted – state reset");
       }
     }}
     ```

3. **Restore the `rows` prop** (if it was intentionally there):
   - Add back `rows={1}` prop (though this was invalid and causing a linting error)

## Additional Notes

- The fix maintains backward compatibility: all existing functionality (Enter key, button clicks, accidental blur prevention) continues to work
- The fix is isolated to the search input - no other components were modified
- Debug logging was already present and remains unchanged, so debugging can continue using the `VITE_ENABLE_SEARCH_DEBUG` environment variable

