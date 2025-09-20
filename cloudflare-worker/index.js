export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    
    // Define allowed origins
    const allowedOrigins = [
      'https://mletras.vercel.app',
      'http://localhost',
      'http://localhost:8080',
      'http://localhost:3000',
      'http://127.0.0.1',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:3000',
      'http://10.0.2.2:8080',
      'http://10.0.2.2:3000'
    ];
    
    // Check if origin is allowed
    // For Android WebView, origin might be null or different
    const isAllowedOrigin = origin && allowedOrigins.includes(origin);
    const corsOrigin = isAllowedOrigin ? origin : '*'; // Allow all origins for Android compatibility
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': corsOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }
    
    // Proxy Musixmatch API requests
    if (url.pathname.startsWith('/musixmatch/')) {
      const musixmatchUrl = `https://api.musixmatch.com/ws/1.1${url.pathname.replace('/musixmatch', '')}${url.search}`;
      
      // Add your API key server-side
      const apiUrl = new URL(musixmatchUrl);
      apiUrl.searchParams.set('apikey', env.MUSIXMATCH_API_KEY);
      
      // Debug: Log the URL being called
      console.log('Calling Musixmatch API:', apiUrl.toString());
      
      const response = await fetch(apiUrl.toString());
      
      // Add CORS headers
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Access-Control-Allow-Origin', corsOrigin);
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      
      return newResponse;
    }
    
    return new Response('Not Found', { status: 404 });
  }
}
