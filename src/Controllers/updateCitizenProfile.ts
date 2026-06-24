import e from "express";
import { prisma } from "../../lib/prisma";
import Joi from "joi";
import { auditLogger } from "../utils/auditLogger";

const profileSchema = Joi.object({
  name: Joi.string().required().min(3),
  email: Joi.string().email().required(),
  phone: Joi.string()
    .required()
    .pattern(/^[0-9]{11}$/),
  address: Joi.string().required(),
});

export async function updateCitizenProfile(req: e.Request, res: e.Response) {
  const { error, value } = profileSchema.validate(req.body);

  try {
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { name, phone, email, address } = value;
    const userId = Number(req.user?.id);

    const user = await prisma.user.findUnique({ where: { userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found", success: false });
    }

    const savedAddresses = await prisma.address.findMany({
      where: { userId, address },
    });

    if (savedAddresses.length === 0) {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&accept-language=en`;
      const response = await fetch(url, {
        headers: { "User-Agent": "Smart Waste Platform" },
      });
      const data = await response.json();

      if (!data || data.length === 0) {
        return res.status(400).json({
          error: "Your written address is invalid, please write the appropriate address",
          success: false,
        });
      }

      const latitude = parseFloat(data[0].lat);
      const longitude = parseFloat(data[0].lon);

      await prisma.address.create({
        data: { userId, address, latitude, longitude },
      });
    }
    
    const oldUser = await prisma.user.findUnique({
      where: {userId: req.user?.id},
    })

    const newUser=await prisma.user.update({
      where: { userId },
      data: { name, email, phone, address },
    });

    await auditLogger({
      userId: req.user?.id,
      targetType: "USER",
      userRole: "CITIZEN",
      targetId: String(req.user?.id),
      action:"UPDATE",
      req,
      oldValue: oldUser,
      newValue: newUser,
    })

    return res.json({ message: "Profile updated successfully", success: true });

  } catch (err) {
    await auditLogger({
      userId: req.user?.id,
      targetType: "USER",
      userRole: "CITIZEN",
      targetId: String(req.user?.id),
      action:"UPDATE",
      req,
      status: "FAILED"
    })
    console.error(err);
    res.status(500).json({ error: "Error updating citizen profile", success: false });
  }
}