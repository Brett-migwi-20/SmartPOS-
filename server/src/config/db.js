import mongoose from "mongoose";
import env from "./env.js";

export const connectDatabase = async () => {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri);
  console.log(`[db] connected to ${mongoose.connection.host}/${mongoose.connection.name}`);
};
