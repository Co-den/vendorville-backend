import * as loyaltyService from "#services/loyaltyService.js";

// Vendor-side: issue a gift card
export const issueGiftCard = async (req, res) => {
  try {
    const card = await loyaltyService.issueGiftCard(
      req.user.id,
      req.params.id,
      req.body.value,
    );
    res.status(201).json({ card });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Vendor-side: list gift cards issued for this business
export const getGiftCards = async (req, res) => {
  try {
    const cards = await loyaltyService.getGiftCards(req.user.id, req.params.id);
    res.status(200).json({ cards });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Customer-side (storefront): check their points balance for this business
export const getMyPoints = async (req, res) => {
  try {
    const bizResult = await loyaltyService.getBusinessBySlug(req.params.slug);
    const points = await loyaltyService.getCustomerPoints(
      bizResult.id,
      req.customer.id,
    );
    res
      .status(200)
      .json({ points, pointValueKobo: loyaltyService.POINT_VALUE_KOBO });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Customer-side: redeem gift card code at checkout (validation only actual deduction happens at order creation)
export const validateGiftCard = async (req, res) => {
  try {
    const bizResult = await loyaltyService.getBusinessBySlug(req.params.slug);
    const result = await loyaltyService.checkGiftCard(
      bizResult.id,
      req.body.code,
    );
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
