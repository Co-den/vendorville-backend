import * as customerService from "#services/customerService.js";

export const getCustomers = async (req, res, next) => {
  try {
    const list = await customerService.getCustomers(
      req.user.id,
      req.params.businessId,
    );
    res.status(200).json({ customers: list });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const saveNote = async (req, res, next) => {
  try {
    const { phone, name, notes } = req.body;
    const result = await customerService.saveCustomerNote(
      req.user.id,
      req.params.businessId,
      phone,
      name,
      notes,
    );
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
