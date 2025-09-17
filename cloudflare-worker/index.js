export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': 'https://mletras.com',
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
      
      const response = await fetch(apiUrl.toString());
      
      // Add CORS headers
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Access-Control-Allow-Origin', 'https://mletras.com');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      
      return newResponse;
    }
    
    return new Response('Not Found', { status: 404 });
  }
}
