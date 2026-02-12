import env from "./config/env.js";
import { connectDatabase } from "./config/db.js";
import app from "./app.js";

const startServer = async () => {
  try {
    await connectDatabase();
    app.listen(env.port, () => {
      console.log(`[api] running on port ${env.port}`);
    });
  } catch (error) {
    console.error("[api] failed to boot", error.message);
    process.exit(1);
  }
};

startServer();
