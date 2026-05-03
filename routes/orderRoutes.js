import express from "express";
import {
  getMyOrders,
  getAllOrders,
  markAsDelivered,
  placeOrder,
  downloadInvoice,
} from "../controllers/orderController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔹 Checkout Order
router.post("/", protect, placeOrder);

// 🔹 User Routes
router.get("/myorders", protect, getMyOrders);

// 📄 Invoice Download
router.get("/:id/invoice", protect, downloadInvoice);

// 🔹 Admin Routes
router.get("/", protect, admin, getAllOrders);
router.put("/:id/deliver", protect, admin, markAsDelivered);

export default router;
