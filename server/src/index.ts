import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "node:path";
import { existsSync } from "node:fs";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import closetRoutes from "./routes/closets";
import itemRoutes from "./routes/items";
import tagRoutes from "./routes/tags";
import { closeBrowser, launchBrowser } from "./services/browser";
import { errorHandler, HttpError } from "./utils/http";
import { requireAuth } from "./middleware/auth";

export function createApp() {
  const app = express();
  const isProduction = process.env.NODE_ENV === "production";
  const publicDir = path.resolve(__dirname, "../../../public");

  app.use(helmet());
  app.use(
    cors({
      origin: isProduction ? process.env.FRONTEND_ORIGIN ?? false : true,
      credentials: true
    })
  );
  app.use(cookieParser());
  app.use(express.json());

  app.get("/version", (_req, res) => {
    res.json({
      version: process.env.APP_VERSION ?? "development",
      sha: process.env.GIT_SHA ?? "local",
      released_at: process.env.RELEASE_DATE ?? null
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/user", requireAuth, userRoutes);
  app.use("/api/closets", requireAuth, closetRoutes);
  app.use("/api/items", requireAuth, itemRoutes);
  app.use("/api/tags", requireAuth, tagRoutes);

  app.use("/api", (_req, _res, next) => {
    next(new HttpError(404, "API route not found."));
  });

  if (existsSync(publicDir)) {
    app.use(express.static(publicDir));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        next();
        return;
      }

      res.sendFile(path.join(publicDir, "index.html"));
    });
  }

  app.use(errorHandler);

  return app;
}

if (process.env.NODE_ENV !== "test") {
  void (async () => {
    try {
      await launchBrowser();
    } catch (error) {
      console.warn("Browser warmup failed, continuing without a prelaunched browser.", error);
    }

    const app = createApp();
    const port = Number(process.env.PORT ?? 3000);
    const server = app.listen(port, () => {
      console.log(`Window Shopping server listening on http://localhost:${port}`);
    });

    let shuttingDown = false;
    const shutdown = (signal: string) => {
      if (shuttingDown) {
        return;
      }

      shuttingDown = true;
      console.log(`Received ${signal}, shutting down...`);
      server.close(async () => {
        await closeBrowser();
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  })();
}
