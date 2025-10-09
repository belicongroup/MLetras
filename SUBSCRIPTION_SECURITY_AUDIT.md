# Subscription & Feature Gating Security Audit

## Executive Summary
This audit reviews the free vs pro feature gating implementation in the MLetras app to ensure proper security and user experience.

## ✅ What's Working Well

### 1. Feature Gating Logic
- **Dark Mode**: Properly gated in `ThemeContext.tsx` with force-light mode for free users
- **Auto-scroll**: Only shown to Pro users in `LyricsPage.tsx` (line 357)
- **Settings UI**: Clear visual indicators showing locked features with Crown icons
- **Subscription Display**: Settings page shows current plan status and upgrade prompts

### 2. Authentication Flow
- Session token stored in localStorage
- User profile refresh on app load
- Subscription type (`free` | `pro`) stored in user object
- Development bypass for testing

## 🚨 Critical Issues Found

### Issue #1: No Paywall or Purchase Flow
**Severity: HIGH**

**Problem:**
- No UI component for upgrading from Free to Pro
- No purchase/subscription flow implementation
- No restore purchase functionality
- Users see "upgrade to Pro" messages but have no way to actually upgrade

**Current State:**
```typescript
// src/components/SettingsPage.tsx:90
{user?.subscription_type === 'free' && (
  <Alert>
    <AlertDescription>
      Upgrade to Pro for unlimited folders, notes, dark mode, and auto-scroll features.
    </AlertDescription>
  </Alert>
)}
// ❌ No button or link to actually upgrade!
```

**Risk:** Poor user experience - users are told to upgrade but cannot.

---

### Issue #2: Offline Subscription Verification
**Severity: MEDIUM-HIGH**

**Problem:**
- When offline, `refreshUser()` fails and clears the user session
- This logs out users who are offline instead of using cached subscription status
- No fallback to last known subscription state

**Current Behavior:**
```typescript
// src/contexts/AuthContext.tsx:152-159
const refreshUser = async () => {
  try {
    const response = await makeRequest('/api/user/profile');
    // ✅ Works online
  } catch (error) {
    console.error('Failed to load user:', error);
    localStorage.removeItem('sessionToken');  // ❌ PROBLEM: Clears session when offline!
    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }
};
```

**Risk:** 
- Users lose Pro features when offline
- Free users cannot use the app offline (logged out)
- Poor user experience in airplane mode or low connectivity

---

### Issue #3: Weak Offline Feature Protection
**Severity: MEDIUM**

**Problem:**
- If cached user data shows `subscription_type: 'pro'` but backend status changed to `free`, user retains Pro features offline
- No periodic re-verification of subscription status
- LocalStorage can be manually edited (though this is client-side only)

**Risk:** Users who downgraded could continue using Pro features offline until next successful sync.

---

### Issue #4: Missing Null/Undefined Guards
**Severity: LOW-MEDIUM**

**Problem:**
- Feature checks use `user?.subscription_type === 'free'` without considering `undefined` or `null` states
- If user object is null (e.g., during loading), features might be accessible

**Examples:**
```typescript
// src/pages/LyricsPage.tsx:357
{user?.subscription_type === 'pro' && ( // ✅ Safe - hides if user is null
  <AutoScrollButton />
)}

// src/contexts/ThemeContext.tsx:51
if (isAuthenticated && user?.subscription_type === 'free') { // ✅ Safe - uses isAuthenticated
  return; 
}
```

**Current Assessment:** Mostly safe due to proper null-checking patterns.

---

## 📋 Detailed Feature Gating Review

### Pro Features Correctly Gated ✅

1. **Dark Mode** (`ThemeContext.tsx`)
   - ✅ Disabled for free users
   - ✅ Forced to light mode on detection
   - ✅ Toggle does nothing for free users

2. **Auto-scroll** (`LyricsPage.tsx`)
   - ✅ Button only shown for Pro users
   - ✅ Hidden completely for Free users

3. **Settings UI** (`SettingsPage.tsx`)
   - ✅ Auto-scroll speed selector disabled for Free users
   - ✅ Dark mode toggle disabled for Free users
   - ✅ Visual "Pro" badges shown
   - ✅ Explanatory text for locked features

### Potentially Vulnerable Areas ⚠️

1. **Settings Context** (`SettingsContext.tsx`)
   - ⚠️ Settings stored in localStorage without subscription validation
   - ⚠️ User could manually edit localStorage to set `autoScrollSpeed: "fast"`
   - ⚠️ However, UI won't render the feature, so impact is minimal

2. **Folder Limits** (`BookmarksPage.tsx:290`)
   - ⚠️ Shows "Show upgrade prompt" comment but no implementation
   - Backend enforces limits, but no frontend prompt

---

## 🔧 Recommended Fixes

### Priority 1: Implement Offline-Safe Subscription Caching

**Solution:** Store last known user state and use it as fallback when offline.

```typescript
// Enhanced AuthContext.tsx
const refreshUser = async () => {
  try {
    const sessionToken = localStorage.getItem('sessionToken');
    if (!sessionToken) {
      setAuthState({ user: null, isLoading: false, isAuthenticated: false });
      return;
    }

    const response = await makeRequest('/api/user/profile');
    
    // ✅ Cache the user profile for offline use
    localStorage.setItem('cached_user', JSON.stringify(response.user));
    
    setAuthState({
      user: response.user,
      isLoading: false,
      isAuthenticated: true,
    });
  } catch (error) {
    console.error('Failed to load user:', error);
    
    // ✅ FIX: Try to use cached user data instead of logging out
    const cachedUser = localStorage.getItem('cached_user');
    if (cachedUser) {
      try {
        const user = JSON.parse(cachedUser);
        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: true,
        });
        console.warn('⚠️ Using cached user profile (offline mode)');
        return;
      } catch (parseError) {
        console.error('Failed to parse cached user:', parseError);
      }
    }
    
    // Only clear session if we have no cached data
    localStorage.removeItem('sessionToken');
    setAuthState({ user: null, isLoading: false, isAuthenticated: false });
  }
};
```

### Priority 2: Add Upgrade/Paywall UI

**Solution:** Create a paywall modal/page for upgrading to Pro.

```typescript
// New component: src/components/UpgradeModal.tsx
export function UpgradeModal({ isOpen, onClose }: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upgrade to Pro</DialogTitle>
          <DialogDescription>
            Unlock all premium features with MLetras Pro
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <FeatureList />
          <PricingOptions />
          <Button onClick={handlePurchase}>
            Subscribe to Pro - $4.99/month
          </Button>
          <Button variant="ghost" onClick={handleRestorePurchase}>
            Restore Previous Purchase
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Priority 3: Add Runtime Feature Validation

**Solution:** Add a utility hook to check Pro access with proper fallback.

```typescript
// New hook: src/hooks/useProFeature.ts
export function useProFeature() {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const isPro = useMemo(() => {
    if (isLoading) return false; // Default to locked while loading
    if (!isAuthenticated) return false;
    return user?.subscription_type === 'pro';
  }, [user, isAuthenticated, isLoading]);
  
  const canUseFeature = (feature: ProFeature) => {
    // Add specific feature checks here if needed
    return isPro;
  };
  
  return { isPro, canUseFeature };
}
```

### Priority 4: Add Folder Limit Upgrade Prompt

```typescript
// Fix in BookmarksPage.tsx:290
if (error.message.includes('Folder limit reached')) {
  setShowUpgradeModal(true); // ✅ Actually show upgrade UI
}
```

---

## 🧪 Testing Recommendations

### Test Cases

1. **Offline Free User**
   - [ ] Login as Free user
   - [ ] Go offline (disable network)
   - [ ] Verify user stays logged in
   - [ ] Verify Pro features remain locked
   - [ ] Verify app remains functional

2. **Offline Pro User**
   - [ ] Login as Pro user
   - [ ] Go offline
   - [ ] Verify Pro features still work
   - [ ] Verify auto-scroll works
   - [ ] Verify dark mode works

3. **Subscription Downgrade**
   - [ ] Backend changes user from Pro → Free
   - [ ] User is offline
   - [ ] Verify they retain Pro features until next online sync
   - [ ] Go online
   - [ ] Verify features lock immediately

4. **Feature Locking**
   - [ ] As Free user, verify dark mode toggle does nothing
   - [ ] Verify auto-scroll button is hidden
   - [ ] Verify settings show "Pro" badges
   - [ ] Verify no console errors when clicking locked features

5. **Upgrade Flow**
   - [ ] Click "Upgrade to Pro" prompt
   - [ ] Verify paywall/purchase UI shows
   - [ ] Test purchase flow (when implemented)
   - [ ] Test restore purchase (when implemented)

---

## 📊 Summary

| Issue | Severity | Status | Impact |
|-------|----------|--------|---------|
| No paywall/purchase flow | HIGH | ❌ Not implemented | Users cannot upgrade |
| Offline logout bug | HIGH | ❌ Not fixed | Users logged out offline |
| Weak offline protection | MEDIUM | ⚠️ Acceptable | Limited risk |
| Null guards | LOW | ✅ Mostly safe | Current checks are adequate |

## Conclusion

**Current State:** Feature gating logic is well-implemented, but there are critical UX and offline handling issues.

**Recommendation:** Implement Priority 1 (offline caching) and Priority 2 (upgrade UI) immediately before production release.

