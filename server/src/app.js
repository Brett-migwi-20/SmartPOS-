import cors from "cors";
import express from "express";
import morgan from "morgan";
import env from "./config/env.js";
import { attachAuthContext } from "./middleware/authContext.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import apiRoutes from "./routes/index.js";

const app = express();

app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true
  })
);

app.use(express.json({ limit: "15mb" }));
app.use(morgan("dev"));
app.use(attachAuthContext);

app.get("/", (req, res) => {
  res.json({
    name: "SmartPOS API",
    docs: "/api/health"
  });
});

app.use("/api", apiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
