import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "../lib/db.js";
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import tenantRoutes from "./routes/tenant.route.js";
import rentableUnitRoutes from "./routes/rentableUnit.route.js";
import dashboardRoutes from "./routes/dashboard.route.js";
import paymentMethodRoutes from "./routes/paymentMethod.route.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import swaggerUi from "swagger-ui-express";
import paymentRoutes from "./routes/paymentRecord.route.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const swaggerDocumentPath = path.join(__dirname, "docs/swagger-output.json");

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/rentable-units", rentableUnitRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/payment-methods", paymentMethodRoutes);
app.use("/api/payments", paymentRoutes);

// Swagger Interactive API Documentation & Raw OpenAPI JSON
if (fs.existsSync(swaggerDocumentPath)) {
  const swaggerDocument = JSON.parse(
    fs.readFileSync(swaggerDocumentPath, "utf-8"),
  );
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerDocument);
  });
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "Rent Backend API",
  });
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("[ServerError]", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// Start Server & DB connection
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(
      `[Server] Express server listening on http://localhost:${PORT}`,
    );
  });
};

startServer();
