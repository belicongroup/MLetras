# 🧪 MLetras Real-World Testing Guide

## 🎯 Complete User Authentication Flow Testing

### **Step 1: Access the App**
- **Frontend URL**: http://localhost:5173
- **Backend**: https://mletras-auth-api-dev.belicongroup.workers.dev (Cloudflare Worker)
- **Email Service**: Resend (real emails)

### **Step 2: Test Authentication Flow**

#### **🔐 Login Process:**
1. **Open** http://localhost:5173 in your browser
2. **Enter email**: `cruz8teen50@gmail.com` (or any email you want to test)
3. **Click "Login"** or "Sign Up"
4. **Check your email** - You'll receive a real OTP email from `noreply@mail.mletras.com`
5. **Enter the OTP code** from your email
6. **Click "Verify"**

#### **✅ Expected Results:**
- ✅ Real email sent via Resend
- ✅ OTP verification works
- ✅ User session created
- ✅ Redirected to dashboard
- ✅ User data displayed

### **Step 3: Test Different Scenarios**

#### **🆕 New User Signup:**
- Use a **new email address** you haven't used before
- Should create new user account
- Should receive welcome email

#### **🔄 Existing User Login:**
- Use `cruz8teen50@gmail.com` (already exists)
- Should recognize existing user
- Should update last login time

#### **❌ Invalid OTP:**
- Enter wrong OTP code
- Should show error message
- Should allow retry

#### **⏰ Expired OTP:**
- Wait 10+ minutes after receiving OTP
- Try to verify
- Should show "expired" error

### **Step 4: Test App Features**

#### **🎵 Lyrics Search:**
- After authentication, test lyrics search
- Should work with authenticated session
- Should respect rate limits

#### **📝 User Profile:**
- Check user data display
- Verify subscription type (should be "free")
- Check email verification status

### **Step 5: Monitor Backend**

#### **📊 Check Logs:**
```bash
# In the backend directory
npx wrangler tail mletras-auth-api-dev --env development
```

#### **🗄️ Check Database:**
```bash
# View users
npx wrangler d1 execute mletras-auth-db --remote --command="SELECT * FROM users;"

# View OTPs
npx wrangler d1 execute mletras-auth-db --remote --command="SELECT * FROM otps ORDER BY created_at DESC LIMIT 5;"
```

#### **📧 Check Resend Dashboard:**
- Visit: https://resend.com/emails
- Check email delivery logs
- Verify email content and formatting

### **Step 6: Test Edge Cases**

#### **🌐 Network Issues:**
- Test with slow connection
- Test offline/online transitions

#### **🔒 Security:**
- Test with invalid email formats
- Test with very long email addresses
- Test rate limiting

#### **📱 Mobile Testing:**
- Test on mobile device
- Check responsive design
- Test touch interactions

## 🎉 Success Criteria

### **✅ Authentication Working:**
- [ ] Real emails sent via Resend
- [ ] OTP verification successful
- [ ] User sessions created
- [ ] Dashboard accessible after login

### **✅ User Experience:**
- [ ] Smooth login flow
- [ ] Clear error messages
- [ ] Responsive design
- [ ] Fast loading times

### **✅ Backend Performance:**
- [ ] Fast API responses
- [ ] Proper error handling
- [ ] Rate limiting working
- [ ] Database operations successful

## 🐛 Troubleshooting

### **Email Not Received:**
1. Check spam folder
2. Check Resend dashboard for delivery status
3. Verify email address is correct
4. Check backend logs for errors

### **OTP Verification Fails:**
1. Check if OTP is expired (10 minutes)
2. Verify OTP code is correct
3. Check database for OTP record
4. Check backend logs

### **Frontend Issues:**
1. Check browser console for errors
2. Verify API endpoints are correct
3. Check network requests in DevTools
4. Clear browser cache/storage

## 📞 Support

If you encounter any issues:
1. Check the backend logs: `npx wrangler tail mletras-auth-api-dev --env development`
2. Check the database: `npx wrangler d1 execute mletras-auth-db --remote --command="SELECT * FROM users;"`
3. Check Resend dashboard for email delivery
4. Check browser console for frontend errors

---

**Happy Testing! 🎵✨**
