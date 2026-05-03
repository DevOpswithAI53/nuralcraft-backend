import Order from "../models/Order.js";
import User from "../models/User.js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

/**
 * 🧾 Utility: Generate Invoice PDF
 */
const generateInvoice = async (order) => {
  const invoiceDir = path.join(process.cwd(), "backend/invoices");
  if (!fs.existsSync(invoiceDir)) fs.mkdirSync(invoiceDir, { recursive: true });

  const filePath = path.join(invoiceDir, `invoice_${order._id}.pdf`);
  const doc = new PDFDocument({ margin: 50 });

  doc.pipe(fs.createWriteStream(filePath));

  // Header
  doc
    .fontSize(20)
    .text("NuralCraft PC Builds", { align: "center" })
    .moveDown();
  doc.fontSize(14).text("INVOICE", { align: "center" }).moveDown();

  // Order Info
  doc.fontSize(10);
  doc.text(`Invoice ID: ${order._id}`);
  doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
  doc.moveDown();

  // Customer
  doc.fontSize(12).text("Billed To:");
  doc
    .fontSize(10)
    .text(order.user.name)
    .text(order.user.email)
    .text(order.shippingAddress.address)
    .text(
      `${order.shippingAddress.city}, ${order.shippingAddress.postalCode}`
    )
    .text(order.shippingAddress.country);

  doc.moveDown();

  // Table Header
  doc.fontSize(12).text("Order Items");
  doc.moveDown(0.5);

  order.orderItems.forEach((item) => {
    doc
      .fontSize(10)
      .text(
        `${item.name}  |  Qty: ${item.qty}  |  ₹${item.price}  |  ₹${
          item.qty * item.price
        }`
      );
  });

  doc.moveDown();

  // Totals
  doc.text(`Items Total: ₹${order.itemsPrice}`);
  doc.text(`Tax: ₹${order.taxPrice}`);
  doc.fontSize(12).text(`Grand Total: ₹${order.totalPrice}`, {
    underline: true,
  });

  doc.end();
  return filePath;
};

/**
 * @desc    Create an order from checkout
 * @route   POST /api/orders
 * @access  Private
 */
export const placeOrder = async (req, res) => {
  try {
    const { user, orderItems, shippingAddress, totalPrice } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: "No order items found" });
    }

    const newOrder = await Order.create({
      user,
      orderItems: orderItems.map((item) => ({
        name: item.name,
        qty: item.quantity || 1,
        image: item.image,
        price: item.price,
        product: item._id,
      })),
      shippingAddress,
      paymentMethod: "UPI / Card",
      itemsPrice: totalPrice,
      taxPrice: Math.round(totalPrice * 0.18),
      totalPrice: totalPrice + Math.round(totalPrice * 0.18),
      isPaid: true,
      paidAt: Date.now(),
      paymentInfo: { id: "manual_checkout", status: "paid" },
    });

    const populatedOrder = await newOrder.populate("user", "name email");

    await generateInvoice(populatedOrder);

    res.status(201).json({
      message: "Order placed successfully",
      orderId: newOrder._id,
      invoiceAvailable: true,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ message: "Failed to place order" });
  }
};

/**
 * 📥 Download invoice PDF
 * @route GET /api/orders/:id/invoice
 * @access Private
 */
export const downloadInvoice = async (req, res) => {
  const order = await Order.findById(req.params.id).populate("user", "name email");
  if (!order) return res.status(404).json({ message: "Order not found" });

  const filePath = path.join(
    process.cwd(),
    "backend/invoices",
    `invoice_${order._id}.pdf`
  );

  if (!fs.existsSync(filePath)) {
    await generateInvoice(order);
  }

  res.download(filePath);
};

/**
 * @desc Get logged-in user's orders
 */
export const getMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user._id });
  res.json(orders);
};

/**
 * @desc Get all orders (admin)
 */
export const getAllOrders = async (req, res) => {
  const orders = await Order.find({})
    .populate("user", "id name email")
    .sort({ createdAt: -1 });
  res.json(orders);
};

/**
 * @desc Mark order as delivered (admin)
 */
export const markAsDelivered = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (order) {
    order.isDelivered = true;
    order.deliveredAt = Date.now();
    await order.save();
    res.json({ message: "Order marked as delivered" });
  } else {
    res.status(404).json({ message: "Order not found" });
  }
};
