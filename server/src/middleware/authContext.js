import mongoose from "mongoose";
import User from "../models/User.js";

const parseBearerToken = (authorizationHeader = "") => {
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return "";
  }
  return authorizationHeader.slice(7).trim();
};

const extractUserIdFromToken = (token = "") => {
  if (!token) {
    return "";
  }

  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const [userId] = decoded.split(":");
    return userId || "";
  } catch (error) {
    return "";
  }
};

const safeStringHeader = (headerValue) => (typeof headerValue === "string" ? headerValue.trim() : "");

const defaultAuthUser = {
  id: "",
  name: "Anonymous",
  role: "Viewer",
  email: ""
};

export const attachAuthContext = async (req, res, next) => {
  const token = parseBearerToken(req.headers.authorization || "");
  const tokenUserId = extractUserIdFromToken(token);
  const headerUserId = safeStringHeader(req.headers["x-user-id"]);

  const userId = tokenUserId || headerUserId;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    req.authUser = defaultAuthUser;
    return next();
  }

  try {
    const user = await User.findById(userId).select("_id name email role");
    if (!user) {
      req.authUser = defaultAuthUser;
      return next();
    }

    req.authUser = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role
    };

    return next();
  } catch (error) {
    return next(error);
  }
};
