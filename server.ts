import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import webpush from "web-push";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Prefer runtime-provided VAPID keys. Fall back to generated ephemeral keys in dev.
const generatedVapidKeys = webpush.generateVAPIDKeys();
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || generatedVapidKeys.publicKey;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || generatedVapidKeys.privateKey;

webpush.setVapidDetails(
  "mailto: <anton.a.zotov@gmail.com>",
  vapidPublicKey,
  vapidPrivateKey
);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Web Push Endpoints
  app.get("/api/vapidPublicKey", (req, res) => {
    res.send(vapidPublicKey);
  });

  app.post("/api/sendPush", async (req, res) => {
    const { subscription, payload } = req.body;
    if (!subscription || !payload) {
      return res.status(400).json({ error: "Missing subscription or payload" });
    }
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error sending push notification:", error);
      res.status(500).json({ error: "Failed to send push notification" });
    }
  });

  // GIF Search Proxy
  app.get("/api/gifs/search", async (req, res) => {
    const { q } = req.query;
    const apiKey = process.env.GIPHY_API_KEY;
    if (!apiKey) {
      // Fallback to mock GIFs if API key is not configured
      return res.json({
        data: [
          {
            id: "1",
            title: "Mock GIF 1",
            images: {
              fixed_height_small: { url: "https://media.giphy.com/media/3o7aD2saal6qU6JABa/200.gif" },
              original: { url: "https://media.giphy.com/media/3o7aD2saal6qU6JABa/giphy.gif" }
            }
          },
          {
            id: "2",
            title: "Mock GIF 2",
            images: {
              fixed_height_small: { url: "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/200.gif" },
              original: { url: "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif" }
            }
          },
          {
            id: "3",
            title: "Mock GIF 3",
            images: {
              fixed_height_small: { url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/200.gif" },
              original: { url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif" }
            }
          },
          {
            id: "4",
            title: "Mock GIF 4",
            images: {
              fixed_height_small: { url: "https://media.giphy.com/media/xT0xezQGU5xCDJuCPe/200.gif" },
              original: { url: "https://media.giphy.com/media/xT0xezQGU5xCDJuCPe/giphy.gif" }
            }
          }
        ]
      });
    }
    try {
      const response = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${q}&limit=10`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch GIFs" });
    }
  });

  // GIF Trending Proxy
  app.get("/api/gifs/trending", async (req, res) => {
    const apiKey = process.env.GIPHY_API_KEY;
    if (!apiKey) {
      // Fallback to mock GIFs if API key is not configured
      return res.json({
        data: [
          {
            id: "1",
            title: "Mock GIF 1",
            images: {
              fixed_height_small: { url: "https://media.giphy.com/media/3o7aD2saal6qU6JABa/200.gif" },
              original: { url: "https://media.giphy.com/media/3o7aD2saal6qU6JABa/giphy.gif" }
            }
          },
          {
            id: "2",
            title: "Mock GIF 2",
            images: {
              fixed_height_small: { url: "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/200.gif" },
              original: { url: "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif" }
            }
          },
          {
            id: "3",
            title: "Mock GIF 3",
            images: {
              fixed_height_small: { url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/200.gif" },
              original: { url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif" }
            }
          },
          {
            id: "4",
            title: "Mock GIF 4",
            images: {
              fixed_height_small: { url: "https://media.giphy.com/media/xT0xezQGU5xCDJuCPe/200.gif" },
              original: { url: "https://media.giphy.com/media/xT0xezQGU5xCDJuCPe/giphy.gif" }
            }
          }
        ]
      });
    }
    try {
      const response = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=10`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trending GIFs" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
