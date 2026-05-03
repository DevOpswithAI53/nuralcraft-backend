import Product from "../models/Product.js";

// @desc Fetch all products
// @route GET /api/products
// @access Public
export const getProducts = async (req, res) => {
  const products = await Product.find({});
  res.json(products);
};

// @desc Fetch single product
// @route GET /api/products/:id
// @access Public
export const getProductById = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (product) res.json(product);
  else res.status(404).json({ message: "Product not found" });
};

// @desc Admin: Create new product
// @route POST /api/products
// @access Private/Admin
export const createProduct = async (req, res) => {
  const { name, price, brand, category, description, image, countInStock } =
    req.body;

  const product = new Product({
    name,
    price,
    brand,
    category,
    description,
    image,
    countInStock,
  });

  const createdProduct = await product.save();
  res.status(201).json(createdProduct);
};

// @desc Admin: Update product
// @route PUT /api/products/:id
// @access Private/Admin
export const updateProduct = async (req, res) => {
  const { name, price, brand, category, description, image, countInStock } =
    req.body;

  const product = await Product.findById(req.params.id);
  if (product) {
    product.name = name || product.name;
    product.price = price || product.price;
    product.brand = brand || product.brand;
    product.category = category || product.category;
    product.description = description || product.description;
    product.image = image || product.image;
    product.countInStock = countInStock ?? product.countInStock;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } else {
    res.status(404).json({ message: "Product not found" });
  }
};

// @desc Admin: Delete product
// @route DELETE /api/products/:id
// @access Private/Admin
export const deleteProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (product) {
    await product.deleteOne();
    res.json({ message: "Product removed" });
  } else {
    res.status(404).json({ message: "Product not found" });
  }
};
