import * as customerService from "#services/customerService.js";

export const getCustomers = async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);

    if (!Number.isInteger(businessId)) {
      return res.status(400).json({
        message: "Invalid business ID",
      });
    }

    const list = await customerService.getCustomers(req.user.id, businessId);

    res.status(200).json({
      customers: list,
    });
  } catch (error) {
    console.error("GET CUSTOMERS ERROR:", error);

    res.status(400).json({
      message: error.message,
    });
  }
};

export const saveNote = async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);

    if (!Number.isInteger(businessId)) {
      return res.status(400).json({
        message: "Invalid business ID",
      });
    }

    const { phone, name, notes } = req.body;

    const result = await customerService.saveCustomerNote(
      req.user.id,
      businessId,
      phone,
      name,
      notes,
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("SAVE CUSTOMER NOTE ERROR:", error);

    res.status(400).json({
      message: error.message,
    });
  }
};
