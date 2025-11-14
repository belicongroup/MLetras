# 📱 Subscription Setup Guide - Simplified

## 🎯 What You're Doing
You're adding a **monthly subscription** (like Netflix or Spotify) so users can pay monthly to unlock Pro features.

---

## 📋 What I Need From You First

Before we start, please tell me:

1. **Subscription Price:**
   - How much per month? (e.g., $4.99, $6.99, $9.99)
   - What currency? (USD, EUR, etc.)

2. **Subscription Name:**
   - What should it be called? (e.g., "MLetras Pro", "MLetras Premium")

3. **Free Trial:**
   - Do you want a free trial? (e.g., 7 days, 14 days, or none)

4. **Features to Lock:**
   - Based on your app, these are the Pro features:
     - ✅ Unlimited folders (free users get 1 folder)
     - ✅ Unlimited notes (free users get 3 notes)
     - ✅ Auto-scroll lyrics
     - ✅ Dark theme
     - ✅ Priority support

---

## 🔄 The Process (Two Parts)

### **Part 1: App Store Connect Setup** (You do this)
- Create subscription in Apple's system
- Set pricing
- Add descriptions

### **Part 2: Code Implementation** (I do this)
- Connect your app to Apple's payment system
- Unlock features when user subscribes
- Handle subscription status

---

## 📝 Step-by-Step: App Store Connect

### Step 1: Create Subscription Group
1. In App Store Connect → Subscriptions page (where you are now)
2. Click the blue **"Create"** button under "Subscription Groups"
3. Name it: **"MLetras Subscriptions"** (or whatever you prefer)
4. Click **"Create"**

### Step 2: Create Your Subscription
1. Inside your new group, click **"+"** or **"Create Subscription"**
2. Fill in:
   - **Reference Name:** `MLetras Pro` (internal name, only you see)
   - **Product ID:** `com.mletras.pro.monthly` (must be unique, format: your.bundle.id.pro.monthly)
   - **Subscription Duration:** `1 Month`
   - Click **"Create"**

### Step 3: Set Pricing
1. Click on your subscription
2. Go to **"Pricing and Availability"**
3. Click **"Add Price"**
4. Select your price (e.g., $6.99/month)
5. Click **"Save"**

### Step 4: Add Subscription Details
1. Go to **"Subscription Information"**
2. Fill in:
   - **Display Name:** `MLetras Pro` (what users see)
   - **Description:** 
     ```
     Unlock unlimited folders, unlimited notes, auto-scroll, dark theme, and priority support.
     ```
3. Click **"Save"**

### Step 5: Add Localization (Optional but Recommended)
1. Click **"Add Localization"**
2. Select language (start with English)
3. Add:
   - **Name:** `MLetras Pro`
   - **Description:** Full description of features
4. Click **"Save"**

---

## ⚠️ Important Notes

### The Blue Info Box Says:
> "Your first subscription must be submitted with a new app version."

**What this means:**
- You can't submit JUST the subscription
- You must upload a new app version (1.0.2) that includes subscription code
- Then link the subscription to that version
- Then submit both together

**So the order is:**
1. ✅ Create subscription in App Store Connect (do this now)
2. ✅ I'll add subscription code to your app
3. ✅ You upload new version (1.0.2) to App Store Connect
4. ✅ Link subscription to that version
5. ✅ Submit for review

---

## 🚀 What Happens Next

Once you give me the pricing info:
1. I'll implement StoreKit integration in your code
2. I'll update the UpgradeModal to actually work
3. I'll add subscription status checking
4. I'll add "Restore Purchases" functionality
5. You'll test it, then upload to App Store Connect

---

## ❓ Questions?

**Q: Can I change the price later?**
A: Yes, but you need to create a new subscription. Old subscribers keep their price.

**Q: What if I want yearly instead of monthly?**
A: You can create both! Create a monthly AND yearly subscription in the same group.

**Q: Do I need to set up billing grace period?**
A: Not required, but recommended. It gives users 16 days if payment fails.

**Q: What about the "Streamlined Purchasing"?**
A: Skip this for now. It's for advanced features.

---

## 📞 Ready to Start?

**Please provide:**
1. Monthly price (e.g., $6.99)
2. Subscription name (e.g., "MLetras Pro")
3. Free trial days (e.g., 14 days or 0)

Then I'll handle the code implementation! 🎉

