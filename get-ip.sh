#!/bin/bash
echo "🔍 Finding your Mac's local IP address..."
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
echo ""
echo "✅ Your Mac's IP Address: $IP"
echo ""
echo "📱 To test on iPhone:"
echo "   1. Make sure iPhone is on same WiFi"
echo "   2. Open Safari and go to: http://$IP:8080"
echo "   3. Add this URL to Google Cloud Console:"
echo "      → http://$IP:8080"
echo ""
