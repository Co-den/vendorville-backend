import * as deliveryZoneService from "#services/deliveryZoneService.js";

export const getZones = async (req, res) => {
  try {
    const zones = await deliveryZoneService.getZonesForVendor(
      req.user.id,
      req.params.id,
    );
    res.status(200).json({ zones });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const addZone = async (req, res) => {
  try {
    const zone = await deliveryZoneService.addZone(
      req.user.id,
      req.params.id,
      req.body,
    );
    res.status(201).json({ zone });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateZone = async (req, res) => {
  try {
    const zone = await deliveryZoneService.updateZone(
      req.user.id,
      req.params.id,
      req.params.zoneId,
      req.body,
    );
    res.status(200).json({ zone });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteZone = async (req, res) => {
  try {
    await deliveryZoneService.deleteZone(
      req.user.id,
      req.params.id,
      req.params.zoneId,
    );
    res.status(200).json({ message: "Zone deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
