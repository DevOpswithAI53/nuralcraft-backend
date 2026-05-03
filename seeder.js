import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "./models/Product.js";
import connectDB from "./config/db.js";

dotenv.config();
connectDB();

const products = [
  {
    name: "Intel Core i9-13900K",
    image: "https://m.media-amazon.com/images/I/61M0t6+6cBL._SL1500_.jpg",
    category: "Processor",
    price: 58900,
    countInStock: 10,
  },
  {
    name: "NVIDIA RTX 4090",
    image: "https://m.media-amazon.com/images/I/71s+crkLLPL._SL1500_.jpg",
    category: "Graphics Card",
    price: 179900,
    countInStock: 5,
  },
  {
    name: "Corsair Vengeance 32GB DDR5",
    image: "https://m.media-amazon.com/images/I/61m1k8V3dRL._SL1500_.jpg",
    category: "Memory",
    price: 15999,
    countInStock: 20,
  },
  {
    name: "Samsung 980 PRO 1TB NVMe SSD",
    image: "https://m.media-amazon.com/images/I/81LHbM7-jzL._SL1500_.jpg",
    category: "Storage",
    price: 8999,
    countInStock: 15,
  },
  {
    name: "ASUS ROG STRIX Z790-E Gaming Motherboard",
    image: "https://m.media-amazon.com/images/I/81LqHoxb5ML._SL1500_.jpg",
    category: "Motherboard",
    price: 45999,
    countInStock: 8,
  },
  {
    name: "Cooler Master Hyper 212 RGB CPU Cooler",
    image: "https://m.media-amazon.com/images/I/71jP5T4tSGL._SL1500_.jpg",
    category: "Cooling",
    price: 4999,
    countInStock: 25,
  },
  {
    name: "Corsair RM850x 850W Power Supply",
    image: "https://m.media-amazon.com/images/I/71qfZ0rB9oL._SL1500_.jpg",
    category: "Power Supply",
    price: 12499,
    countInStock: 12,
  },
  {
    name: "Lian Li Lancool II Mesh RGB Cabinet",
    image: "https://m.media-amazon.com/images/I/81ZVd1LCUOL._SL1500_.jpg",
    category: "PC Case",
    price: 12999,
    countInStock: 10,
  },
];

const importData = async () => {
  try {
    await Product.deleteMany();
    await Product.insertMany(products);
    console.log("✅ Sample products inserted successfully!");
    process.exit();
  } catch (error) {
    console.error("❌ Error seeding products:", error);
    process.exit(1);
  }
};

importData();
