#!/usr/bin/env python3
"""
Simple HTTPS server for local development
Creates a self-signed certificate and serves files over HTTPS
"""
import http.server
import ssl
import os
import subprocess
import sys
import socket

PORT = 8000

def get_local_ip():
    """Get the local IP address"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Doesn't actually connect, just gets the local IP
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

def create_self_signed_cert():
    """Create a self-signed certificate for HTTPS"""
    cert_file = 'server.pem'
    key_file = 'server.key'
    
    # Check if cert already exists
    if os.path.exists(cert_file) and os.path.exists(key_file):
        return cert_file, key_file
    
    # Create certificate using openssl
    try:
        # Generate private key and certificate in one command
        cmd = [
            'openssl', 'req', '-x509', '-newkey', 'rsa:2048',
            '-keyout', key_file, '-out', cert_file,
            '-days', '365', '-nodes',
            '-subj', '/C=US/ST=State/L=City/O=Organization/CN=localhost'
        ]
        subprocess.run(cmd, check=True, capture_output=True)
        print(f"✅ Created self-signed certificate: {cert_file}")
        return cert_file, key_file
    except subprocess.CalledProcessError as e:
        print(f"❌ Error creating certificate: {e}")
        print("\n💡 Make sure OpenSSL is installed:")
        print("   On macOS: openssl should already be available")
        sys.exit(1)
    except FileNotFoundError:
        print("❌ OpenSSL not found. Please install OpenSSL.")
        sys.exit(1)

def main():
    cert_file, key_file = create_self_signed_cert()
    
    # Create server
    server_address = ('0.0.0.0', PORT)
    handler = http.server.SimpleHTTPRequestHandler
    
    httpd = http.server.HTTPServer(server_address, handler)
    
    # Wrap socket with SSL
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(cert_file, key_file)
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    
    local_ip = get_local_ip()
    
    print("\n" + "="*60)
    print("🚀 HTTPS Server Running!")
    print("="*60)
    print(f"\n📱 Access from your iPhone:")
    print(f"   https://{local_ip}:{PORT}")
    print(f"\n💻 Or from this computer:")
    print(f"   https://localhost:{PORT}")
    print(f"\n⚠️  Note: You'll see a security warning because this uses")
    print("   a self-signed certificate. Click 'Advanced' and then")
    print("   'Proceed to {local_ip}' to continue.")
    print("\n" + "="*60)
    print("\nPress Ctrl+C to stop the server\n")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n👋 Server stopped.")
        httpd.shutdown()

if __name__ == '__main__':
    main()


