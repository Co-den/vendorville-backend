import * as productService from "#services/productService.js";

export const getProducts = async (req, res, next) => {
  try {
    const list = await productService.getProducts(
      req.user.id,
      req.params.businessId,
    );
    res.status(200).json({ products: list });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(
      req.user.id,
      req.params.businessId,
      req.body,
      req.file,
    );
    res.status(201).json({ product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(
      req.user.id,
      req.params.businessId,
      req.params.productId,
      req.body,
      req.file,
    );
    res.status(200).json({ product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    await productService.deleteProduct(
      req.user.id,
      req.params.businessId,
      req.params.productId,
    );
    res.status(200).json({ message: "Product deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
