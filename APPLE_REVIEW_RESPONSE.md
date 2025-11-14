# Response to App Review - In-App Purchase Location

## Submission ID: 59f24866-324e-4f02-91dd-148cd796f8c6
## Version: 1.0.3

---

## Steps to Locate In-App Purchase (MLetras Pro Monthly)

### Method 1: Via Settings Tab (Easiest)
1. Launch the MLetras app
2. Tap the **"Settings"** tab at the bottom navigation bar (rightmost tab)
3. Scroll to the **"Account"** section
4. If you are signed in with a free account, you will see a green gradient button labeled **"Upgrade to MLetras Pro"** with a crown icon
5. Tap the **"Upgrade to MLetras Pro"** button
6. The subscription purchase modal will open, displaying:
   - **Subscription Title:** "MLetras Pro Monthly"
   - **Price:** Displayed price per month (e.g., $6.99/month)
   - **Length:** Monthly auto-renewable subscription
   - **Free Trial:** 14-day free trial
   - **Terms of Service Link:** Clickable link to https://mletras.com/terms
   - **Privacy Policy Link:** Clickable link to https://mletras.com/privacy
7. Tap **"Start Free Trial"** button to initiate the purchase flow

### Method 2: Via Notes Feature (If Free User)
1. Launch the MLetras app
2. Tap the **"Notes"** tab at the bottom navigation bar
3. If you have fewer than 3 notes, tap the **"+"** button to create a new note
4. If you already have 3 notes (free tier limit), attempting to create another note will automatically open the upgrade modal
5. The subscription purchase modal will appear with all required information

### Method 3: Via Bookmarks/Folders Feature (If Free User)
1. Launch the MLetras app
2. Tap the **"Bookmarks"** tab at the bottom navigation bar
3. If you have fewer than 1 folder, tap **"Create Folder"**
4. If you already have 1 folder (free tier limit), attempting to create another folder will automatically open the upgrade modal
5. The subscription purchase modal will appear with all required information

---

## Subscription Details Displayed in App

The subscription purchase modal includes all required information as per App Store Review Guidelines 3.1.2:

✅ **Title of auto-renewing subscription:** "MLetras Pro Monthly"  
✅ **Length of subscription:** Monthly (clearly displayed as "per month")  
✅ **Price of subscription:** Displayed dynamically from App Store Connect (e.g., "$6.99")  
✅ **Price per unit:** "$X.XX per month"  
✅ **Functional link to Privacy Policy:** https://mletras.com/privacy (clickable link)  
✅ **Functional link to Terms of Use (EULA):** https://mletras.com/terms (clickable link)  

---

## Sandbox Testing Environment

- **Product ID:** `com.mletras.pro.monthly`
- **Product Type:** Auto-Renewable Subscription
- **Subscription Duration:** 1 Month
- **Free Trial:** 14 days (if configured in App Store Connect)

The in-app purchase is configured for sandbox testing and should work with any sandbox tester account.

---

## Additional Notes

- The subscription modal is accessible to all users, regardless of authentication status
- Free users will see upgrade prompts when they hit tier limits (3 notes, 1 folder)
- Pro users can manage their subscription via the "Manage Subscription" button in Settings
- All subscription information is displayed before the purchase button is tapped
- Terms of Service and Privacy Policy links are functional and open in the device's default browser

---

## Contact Information

If you need any additional information or encounter any issues locating the in-app purchase, please let us know and we'll be happy to assist.

