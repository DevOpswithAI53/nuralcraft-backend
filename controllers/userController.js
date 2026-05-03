import asyncHandler from "express-async-handler";
import generateToken from "../utils/generateToken.js";
import User from "../models/User.js";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import crypto from "crypto";

/* ================= HELPER ================= */

const sendUserWithToken = (res, user) => {
  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,

    twoFactorEnabled: user.twoFactorEnabled,
    twoFactorTempSecret: user.twoFactorTempSecret ? true : false,

    token: generateToken(user._id),
  });
};

/* ================= REGISTER ================= */

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (await User.findOne({ email })) {
    res.status(400);
    throw new Error("User already exists");
  }

  const user = await User.create({ name, email, password });
  sendUserWithToken(res, user);
});

/* ================= LOGIN ================= */

export const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  /* 🔥 ADMIN BYPASS (NO LOCK / NO 2FA BLOCK) */
  if (user.isAdmin) {
    if (!(await user.matchPassword(password))) {
      res.status(401);
      throw new Error("Invalid email or password");
    }
    return sendUserWithToken(res, user);
  }

  /* ❌ NORMAL USER PASSWORD CHECK */
  if (!(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  /* 🔐 2FA REQUIRED */
  if (user.twoFactorEnabled === true) {
    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      requires2FA: true,
    });
  }

  /* 🔐 2FA SETUP */
  if (
    user.twoFactorEnabled === false &&
    user.twoFactorTempSecret &&
    user.twoFactorTempSecret.base32
  ) {
    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      requires2FASetup: true,
      token: generateToken(user._id),
    });
  }

  sendUserWithToken(res, user);
});

/* ================= 2FA LOGIN ================= */

export const verifyTwoFactorLogin = asyncHandler(async (req, res) => {
  const { userId, token } = req.body;

  const user = await User.findById(userId);

  if (!user || !user.twoFactorSecret) {
    res.status(400);
    throw new Error("2FA not enabled");
  }

  /* 🔥 ADMIN BYPASS (NO LOCK) */
  if (user.isAdmin) {
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret.base32,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!verified) {
      res.status(401);
      throw new Error("Invalid authentication code");
    }

    return sendUserWithToken(res, user);
  }

  /* 🔒 LOCK CHECK (ONLY USERS) */
  if (user.twoFALockedUntil && user.twoFALockedUntil > Date.now()) {
    res.status(423);
    throw new Error("2FA temporarily locked. Try again later.");
  }

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret.base32,
    encoding: "base32",
    token,
    window: 1,
  });

  if (!verified) {
    user.failed2FAAttempts += 1;

    if (user.failed2FAAttempts >= 3) {
      user.twoFALockedUntil = new Date(Date.now() + 10 * 60 * 1000);
    }

    await user.save();
    res.status(401);
    throw new Error("Invalid authentication code");
  }

  user.failed2FAAttempts = 0;
  user.twoFALockedUntil = null;
  await user.save();

  sendUserWithToken(res, user);
});

/* ================= PASSWORD RESET ================= */

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const resetToken = crypto.randomBytes(20).toString("hex");

  user.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
  await user.save();

  console.log(
    `RESET LINK: ${process.env.FRONTEND_URL}/reset-password/${resetToken}`
  );

  res.json({ message: "Password reset link sent" });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired token");
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  res.json({ message: "Password reset successful" });
});

/* ================= PROFILE ================= */

export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");

  res.json({
    ...user.toObject(),
    twoFactorEnabled: user.twoFactorEnabled,
    twoFactorTempSecret: user.twoFactorTempSecret ? true : false,
  });
});

export const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  Object.assign(user, req.body);
  const updated = await user.save();
  sendUserWithToken(res, updated);
});

/* ================= 2FA SETUP ================= */

export const setupTwoFactorAuth = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user.twoFactorTempSecret) {
    res.status(403);
    throw new Error("2FA not enabled by admin");
  }

  const qrCode = await QRCode.toDataURL(
    speakeasy.otpauthURL({
      secret: user.twoFactorTempSecret.base32,
      label: `NuralCraft (${user.email})`,
      encoding: "base32",
    })
  );

  res.json({ qrCode });
});

export const verifyTwoFactorAuth = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const user = await User.findById(req.user._id);

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorTempSecret.base32,
    encoding: "base32",
    token,
    window: 1,
  });

  if (!verified) {
    res.status(400);
    throw new Error("Invalid OTP");
  }

  user.twoFactorEnabled = true;
  user.twoFactorSecret = user.twoFactorTempSecret;
  user.twoFactorTempSecret = undefined;

  await user.save();
  res.json({ message: "2FA enabled" });
});

/* ================= ADMIN ================= */

export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select("-password");
  res.json(users);
});

export const adminEnable2FA = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  const secret = speakeasy.generateSecret({ length: 20 });

  user.twoFactorTempSecret = {
    ascii: secret.ascii,
    hex: secret.hex,
    base32: secret.base32,
  };

  user.twoFactorEnabled = false;
  await user.save();

  res.json({ message: "2FA pending" });
});

export const adminDisable2FA = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  user.twoFactorTempSecret = undefined;
  user.failed2FAAttempts = 0;
  user.twoFALockedUntil = null;

  await user.save();
  res.json({ message: "2FA disabled" });
});

export const adminUnlockUser2FA = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  user.failed2FAAttempts = 0;
  user.twoFALockedUntil = null;

  await user.save();
  res.json({ message: "User unlocked" });
});

export const adminResetUserPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;

  const user = await User.findById(req.params.id);

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  res.json({ message: "Password reset successful" });
});

/* ================= CART ================= */

// @route GET /api/users/:id/cart
export const getUserCart = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(user.cart || []);
});

// @route POST /api/users/:id/cart
export const addToCart = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  const product = req.body;

  const existing = user.cart.find((item) => item._id.toString() === product._id);

  if (existing) {
    existing.quantity += 1;
  } else {
    user.cart.push({
      _id: product._id,
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category,
      quantity: 1,
    });
  }

  await user.save();
  res.json(user.cart);
});

// @route DELETE /api/users/:id/cart/:productId
export const removeFromCart = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  user.cart = user.cart.filter(
    (item) => item._id.toString() !== req.params.productId
  );

  await user.save();
  res.json(user.cart);
});

// @route DELETE /api/users/:id/cart
export const clearCart = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  user.cart = [];
  await user.save();

  res.json([]);
});