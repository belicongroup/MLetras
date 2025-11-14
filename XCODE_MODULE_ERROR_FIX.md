# 🔧 Fix: "Unable to find module dependency: 'Capacitor'"

## Problem
Xcode can't find the Capacitor module even though Pods are installed.

## Solution Steps

### Step 1: Close Xcode Completely
- **Quit Xcode** (⌘+Q) - don't just close the window
- Make sure it's completely closed

### Step 2: Reopen the Workspace (NOT the Project!)
**IMPORTANT:** You must open the **workspace**, not the project file.

```bash
open ios/App/App.xcworkspace
```

**OR** in Finder:
- Navigate to `ios/App/` folder
- Double-click **`App.xcworkspace`** (NOT `App.xcodeproj`)

### Step 3: Wait for Indexing
- Xcode will start indexing the project
- Wait for the progress bar at the top to finish
- This may take 1-2 minutes

### Step 4: Clean Build Folder
- Product → Clean Build Folder (⇧⌘K)
- Wait for it to complete

### Step 5: Verify Pods Project is Visible
In Xcode Navigator (left sidebar):
- You should see **"Pods"** project listed
- Expand it to see all the pods including "Capacitor"
- If you don't see "Pods", the workspace didn't load correctly

### Step 6: Build Again
- Press ⌘+B to build
- The error should be gone

---

## If Still Not Working

### Option A: Reinstall Pods
```bash
cd ios/App
rm -rf Pods Podfile.lock
pod install
```

Then reopen the workspace.

### Option B: Check Build Settings
1. Select **"App"** target in Xcode
2. Go to **Build Settings**
3. Search for **"Framework Search Paths"**
4. Should include: `$(inherited)` and `"${PODS_CONFIGURATION_BUILD_DIR}"`

---

## Common Mistakes
❌ Opening `App.xcodeproj` instead of `App.xcworkspace`  
❌ Not waiting for Xcode to finish indexing  
❌ Building before Pods are loaded  

✅ Always open `.xcworkspace` file  
✅ Wait for indexing to complete  
✅ Clean before building  

---

**Try Step 1-6 first. This usually fixes it!** 🚀

