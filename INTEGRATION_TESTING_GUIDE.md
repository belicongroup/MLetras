# 🧪 MLetras Integration Testing Guide

## **Quick Start**

### **Option 1: Using the Test Script**
```bash
.\test-integration.bat
```

### **Option 2: Manual Start**
```bash
npx vite --port 8080 --host 0.0.0.0
```

## **🌐 Access the App**

Once running, open your browser and go to:
- **Local:** http://localhost:8080
- **Network:** http://[your-ip]:8080 (for mobile testing)

## **🔍 Testing Checklist**

### **1. Authentication Flow**
- [ ] **Sign In Button:** Click "Sign In" in the top-right corner
- [ ] **Email Input:** Enter your email (e.g., `cruz8teen50@gmail.com`)
- [ ] **OTP Verification:** Check email for 6-digit code
- [ ] **Username Setup:** Set a username (if first time)
- [ ] **Success:** Should see welcome message and user info in header

### **2. Bookmarks Tab**
- [ ] **Authentication Required:** Should show sign-in prompt if not logged in
- [ ] **User Folders:** Should display your folders from the cloud
- [ ] **Create Folder:** Click "Create Folder" button
- [ ] **Folder Limit:** Free users limited to 3 folders
- [ ] **Folder Display:** Shows folder name and song count

### **3. Notes Tab**
- [ ] **Authentication Required:** Should show sign-in prompt if not logged in
- [ ] **User Notes:** Should display your notes from the cloud
- [ ] **Create Note:** Click "Create Note" button
- [ ] **Note Limit:** Free users limited to 10 notes
- [ ] **Note Display:** Shows note title and artist/song info

### **4. Settings Tab**
- [ ] **Subscription Status:** Shows your current plan (Free/Pro)
- [ ] **Dark Mode:** Disabled for free users with Pro badge
- [ ] **Auto-scroll:** Disabled for free users with Pro badge
- [ ] **Upgrade Prompt:** Shows upgrade message for free users

### **5. Cross-Device Sync**
- [ ] **Create Data:** Add folders/notes on one device
- [ ] **Switch Device:** Open app on another device/browser
- [ ] **Sign In:** Use same email to sign in
- [ ] **Verify Sync:** Data should appear on new device

## **🐛 Troubleshooting**

### **Frontend Won't Start**
```bash
# Check if dependencies are installed
npm install

# Try different port
npx vite --port 3000

# Check for TypeScript errors
npx tsc --noEmit
```

### **Authentication Issues**
- Check browser console for errors
- Verify Cloudflare Worker is deployed
- Check if email is being sent (check spam folder)
- Try incognito mode to clear cache

### **API Connection Issues**
- Check browser network tab for failed requests
- Verify CORS settings in Cloudflare Worker
- Check if session token is being stored

## **📱 Mobile Testing**

### **Android Emulator**
1. Start Android emulator
2. Open browser in emulator
3. Navigate to `http://10.0.2.2:8080`

### **Physical Device**
1. Connect device to same WiFi
2. Find your computer's IP address
3. Navigate to `http://[your-ip]:8080`

## **🔧 Development Tools**

### **Browser DevTools**
- **Console:** Check for JavaScript errors
- **Network:** Monitor API requests
- **Application:** Check localStorage for session tokens
- **Elements:** Inspect UI components

### **Useful Commands**
```bash
# Check running processes
netstat -ano | findstr :8080

# Kill process on port 8080
taskkill /PID [process-id] /F

# Clear npm cache
npm cache clean --force
```

## **✅ Expected Behavior**

### **Free User Experience**
- Can create up to 3 folders
- Can create up to 10 notes
- Dark mode and auto-scroll disabled
- Upgrade prompts visible
- Data synced across devices

### **Pro User Experience**
- Unlimited folders and notes
- All features enabled
- No upgrade prompts
- Full access to all settings

## **📊 Test Data**

### **Sample Folders**
- "My Favorites"
- "Workout Songs"
- "Chill Vibes"

### **Sample Notes**
- Title: "Song Analysis"
- Content: "This song has great lyrics..."
- Artist: "Artist Name"
- Song: "Song Title"

## **🚀 Next Steps**

After successful testing:
1. **Phase 4:** Musixmatch Integration
2. **Phase 5:** Advanced Features
3. **Production:** Deploy to production

---

**Need Help?** Check the browser console for errors and refer to the troubleshooting section above.
