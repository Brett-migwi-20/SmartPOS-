import dotenv from "dotenv";

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/smartpos",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173"
};

export default env;
