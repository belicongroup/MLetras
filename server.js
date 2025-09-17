const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, "dist")));

// Proxy Musixmatch API requests
app.use(
  "/api/musixmatch",
  createProxyMiddleware({
    target: "https://api.musixmatch.com/ws/1.1",
    changeOrigin: true,
    pathRewrite: {
      "^/api/musixmatch": "", // remove /api/musixmatch from the path
    },
    onError: (err, req, res) => {
      console.log("Proxy error:", err);
      res.status(500).json({ error: "Proxy error" });
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log("Proxying request:", req.method, req.url);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log("Proxy response:", proxyRes.statusCode, req.url);
    },
  }),
);

// Handle client-side routing - serve index.html for all non-API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(
    `Musixmatch proxy available at http://localhost:${PORT}/api/musixmatch`,
  );
});
