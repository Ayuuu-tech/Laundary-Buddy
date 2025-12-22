/**
 * Cloudflare Workers Entry Point for Laundry Buddy Backend
 * 
 * This file adapts the Express.js server to run on Cloudflare Workers
 */

// Import the Express app
const app = require('./server');

// Cloudflare Workers fetch handler
export default {
  async fetch(request, env, ctx) {
    try {
      // Set environment variables from Cloudflare secrets
      if (env.MONGODB_URI) process.env.MONGODB_URI = env.MONGODB_URI;
      if (env.JWT_SECRET) process.env.JWT_SECRET = env.JWT_SECRET;
      if (env.ALLOWED_ORIGINS) process.env.ALLOWED_ORIGINS = env.ALLOWED_ORIGINS;
      
      // Convert Cloudflare Request to Node.js-compatible request
      const nodeRequest = await convertRequest(request);
      
      // Call Express app
      return await handleExpressRequest(app, nodeRequest);
    } catch (error) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Internal server error',
        error: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

/**
 * Convert Cloudflare Request to Node.js request format
 */
async function convertRequest(cfRequest) {
  const url = new URL(cfRequest.url);
  
  return {
    method: cfRequest.method,
    url: url.pathname + url.search,
    headers: Object.fromEntries(cfRequest.headers),
    body: ['POST', 'PUT', 'PATCH'].includes(cfRequest.method) 
      ? await cfRequest.json() 
      : undefined
  };
}

/**
 * Handle Express request in Cloudflare Workers environment
 */
async function handleExpressRequest(app, nodeRequest) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      headers: {},
      body: '',
      
      status(code) {
        this.statusCode = code;
        return this;
      },
      
      setHeader(name, value) {
        this.headers[name] = value;
        return this;
      },
      
      json(data) {
        this.body = JSON.stringify(data);
        this.headers['Content-Type'] = 'application/json';
        this.end();
      },
      
      send(data) {
        this.body = data;
        this.end();
      },
      
      end() {
        resolve(new Response(this.body, {
          status: this.statusCode,
          headers: this.headers
        }));
      }
    };
    
    // Simulate Express request handling
    app(nodeRequest, res);
  });
}
