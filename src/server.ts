import { createApp } from "./app";
import { env } from "./utils/env";
import { prisma } from "./utils/prisma";

const app = createApp();

const PORT = parseInt(process.env.PORT || "8080", 10);

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("📊 REAL NODE_ENV =", process.env.NODE_ENV);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(async () => {
    console.log("HTTP server closed");
    await prisma.$disconnect();
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("SIGINT signal received: closing HTTP server");
  server.close(async () => {
    console.log("HTTP server closed");
    await prisma.$disconnect();
    process.exit(0);
  });
});

export default app;
