import express from "express";
import {
  registerUser,
  authUser,
  verifyTwoFactorLogin,
  getUserProfile,
  updateUserProfile,
  setupTwoFactorAuth,
  verifyTwoFactorAuth,

  // ADMIN
  getAllUsers,
  adminEnable2FA,
  adminDisable2FA,
  adminResetUserPassword,
  adminUnlockUser2FA,

  // CART
  getUserCart,
  addToCart,
  removeFromCart,
  clearCart,
} from "../controllers/userController.js";

import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ================= AUTH ================= */
router.post("/register", registerUser);
router.post("/login", authUser);
router.post("/login/2fa", verifyTwoFactorLogin);

/* ================= PROFILE ================= */
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);

/* ================= USER 2FA ================= */
router.post("/2fa/setup", protect, setupTwoFactorAuth);
router.post("/2fa/verify", protect, verifyTwoFactorAuth);

/* ================= CART ================= */
router.get("/:id/cart", protect, getUserCart);
router.post("/:id/cart", protect, addToCart);
router.delete("/:id/cart/:productId", protect, removeFromCart);
router.delete("/:id/cart", protect, clearCart);

/* ================= ADMIN ================= */
router.get("/", protect, admin, getAllUsers);
router.put("/admin/enable-2fa/:id", protect, admin, adminEnable2FA);
router.put("/admin/disable-2fa/:id", protect, admin, adminDisable2FA);
router.put("/admin/unlock-2fa/:id", protect, admin, adminUnlockUser2FA);
router.put("/admin/reset-password/:id", protect, admin, adminResetUserPassword);

export default router;