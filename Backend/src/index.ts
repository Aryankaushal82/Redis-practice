import express from 'express';
import redisClient, { connectRedis } from './config/redis';
import cors from 'cors';
import { envConfig } from './config';
import v1Router from './routes/v1';

const app = express();
const PORT = envConfig.port;

app.use(cors());
app.use(express.json());

// routers
app.use("/api/v1", v1Router);
app.get("/health", async (req, res) => {
  const pong = await redisClient.ping();
  res.json({ status: "ok", redis: pong });
});

// redis server
const startServer = async () => {
  try {
    await connectRedis();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server", err);
    process.exit(1);
  }
}

startServer();