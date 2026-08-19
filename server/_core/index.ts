import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { sdk } from "./sdk";
import { claimScheduledJobExecution, getScheduledJobByCronTaskUid } from "../db";
import { executeScheduledJob } from "../lib/jobExecutor";
import { getCurrentHeartbeatSlot } from "../lib/schedule";
import { ENV } from "./env";
import { issueMobileAccessToken, requireMobileRedirectUri } from "./mobileAuth";
import { getUserByOpenId, seedBuiltInTemplates, upsertUser } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.get("/api/mobile/auth", async (req, res) => {
    try {
      const redirectUri = requireMobileRedirectUri(req.query.redirect_uri);
      try {
        const signedInUser = await sdk.authenticateRequest(req);
        const token = await issueMobileAccessToken(signedInUser.id, signedInUser.openId);
        redirectUri.searchParams.set("token", token);
        return res.redirect(302, redirectUri.toString());
      } catch {
        const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
        const forwardedProtocol = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
        const origin = forwardedHost && forwardedHost.endsWith(".manus.space")
          ? `${forwardedProtocol === "http" ? "http" : "https"}://${forwardedHost}`
          : `${req.protocol}://${req.get("host")}`;
        const callback = new URL("/api/mobile/auth/callback", origin);
        callback.searchParams.set("redirect_uri", redirectUri.toString());
        const state = Buffer.from(callback.toString()).toString("base64");
        const login = new URL("/app-auth", ENV.oAuthServerUrl);
        login.searchParams.set("appId", ENV.appId);
        login.searchParams.set("redirectUri", callback.toString());
        login.searchParams.set("state", state);
        login.searchParams.set("type", "signIn");
        return res.redirect(302, login.toString());
      }
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "Mobile authentication failed" });
    }
  });
  app.get("/api/mobile/auth/callback", async (req, res) => {
    try {
      const code = typeof req.query.code === "string" ? req.query.code : "";
      const state = typeof req.query.state === "string" ? req.query.state : "";
      const redirectUri = requireMobileRedirectUri(req.query.redirect_uri);
      if (!code || !state) return res.status(400).json({ error: "code and state are required" });

      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) return res.status(400).json({ error: "Identity provider did not return a user" });
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });
      const user = await getUserByOpenId(userInfo.openId);
      if (!user) return res.status(500).json({ error: "Could not provision the mobile user" });
      await seedBuiltInTemplates(user.id);
      const token = await issueMobileAccessToken(user.id, user.openId);
      redirectUri.searchParams.set("token", token);
      return res.redirect(302, redirectUri.toString());
    } catch (error) {
      console.error("[Mobile auth] Callback failed", error);
      return res.status(500).json({ error: "Mobile sign-in failed" });
    }
  });
  app.post("/api/scheduled/regenerate", async (req, res) => {
    let taskUid: string | undefined;
    try {
      const cronUser = await sdk.authenticateRequest(req);
      taskUid = cronUser.taskUid;
      if (!cronUser.isCron || !taskUid) {
        return res.status(403).json({ error: "cron-only" });
      }

      const job = await getScheduledJobByCronTaskUid(taskUid);
      if (!job) {
        return res.json({ ok: true, skipped: "orphan" });
      }
      if (job.status !== "active") {
        return res.json({ ok: true, skipped: job.status });
      }

      const now = new Date();
      const currentSlot = getCurrentHeartbeatSlot(job.cronExpression, now);
      const claimed = await claimScheduledJobExecution(taskUid, currentSlot, now);
      if (!claimed) {
        return res.json({ ok: true, skipped: "duplicate-delivery" });
      }

      const result = await executeScheduledJob(job.id, job.userId);
      return res.json({ ok: true, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Scheduled regeneration] Callback failed:", error);
      return res.status(500).json({
        error: message,
        stack: error instanceof Error ? error.stack : undefined,
        context: { path: req.path, taskUid },
        timestamp: new Date().toISOString(),
      });
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
