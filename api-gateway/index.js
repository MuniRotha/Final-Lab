require("dotenv").config();
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = process.env.PORT || 4000;

// Registration runs in the SAME pod as the gateway, so it is reached on localhost.
// The update service runs in a different pod, so it is reached through its Kubernetes Service name.
const REGISTRATION_SERVICE_URL = process.env.REGISTRATION_SERVICE_URL || "http://localhost:4001";
const UPDATE_SERVICE_URL = process.env.UPDATE_SERVICE_URL || "http://localhost:4002";

app.use((req, _res, next) => {
  console.log(`[gateway] ${req.method} ${req.originalUrl}`);
  next();
});

app.get("/health", (_req, res) => {
  res.json({
    service: "api-gateway",
    status: "UP",
    routes: {
      "POST /api/register": REGISTRATION_SERVICE_URL,
      "GET /api/students": REGISTRATION_SERVICE_URL,
      "GET /api/students/:id": REGISTRATION_SERVICE_URL,
      "PUT /api/students/:id/mobile": UPDATE_SERVICE_URL,
      "PUT /api/students/:id/password": UPDATE_SERVICE_URL,
    },
  });
});

// PUT /api/students/:id/mobile and /password -> update-service
const updateProxy = createProxyMiddleware({
  target: UPDATE_SERVICE_URL,
  changeOrigin: true,
  pathFilter: (path, req) =>
    req.method === "PUT" && /^\/api\/students\/[^/]+\/(mobile|password)\/?$/.test(path),
  on: {
    error: (_err, _req, res) => {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Update service is unavailable" }));
    },
  },
});

// POST /api/register, GET /api/students, GET /api/students/:id -> registration-service
const registrationProxy = createProxyMiddleware({
  target: REGISTRATION_SERVICE_URL,
  changeOrigin: true,
  pathFilter: ["/api/register", "/api/students"],
  on: {
    error: (_err, _req, res) => {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Registration service is unavailable" }));
    },
  },
});

// Order matters: the more specific update routes are checked first
app.use(updateProxy);
app.use(registrationProxy);

app.use((req, res) => {
  res.status(404).json({ message: `No route for ${req.method} ${req.originalUrl}` });
});

app.listen(PORT, () => console.log(`API gateway running on port ${PORT}`));
