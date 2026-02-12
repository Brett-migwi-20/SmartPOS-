import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/User.js";

export const login = asyncHandler(async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const { password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required.");
  }

  const user = await User.findOne({ email });
  if (!user || user.password !== password) {
    res.status(401);
    throw new Error("Invalid login credentials.");
  }

  const token = Buffer.from(`${user._id}:${Date.now()}`).toString("base64");

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});
