import Joi from "joi";
import path from "path";
import multer from "multer";
import fs from "fs";
import { Request, Response } from "express";
import { PickupRequests } from "../models/pickupRequest";
import { prisma } from "../../lib/prisma";
import { supabase } from "../lib/supabase";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const pickupRequest = new PickupRequests();

const FILE_SIZE = 5 * 1024 * 1024;
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/gif"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, or GIF allowed") as any);
    }
  },
});

const schema = Joi.object({
  wasteType: Joi.string()
    .valid("PET", "CARDBOARD", "PAPER", "METAL", "NON_RECYCLABLE")
    .required()
    .messages({
      "any.only": "Waste Type must be one of the allowed values",
      "any.required": "Waste Type is required",
    }),
  estimatedWeight: Joi.number().required().positive().messages({
    "number.base": "Please enter a valid number",
    "any.required": "Estimated Weight is required",
    "number.positive": "Estimated Weight must be positive",
  }),
  pickupAddress: Joi.string().required().messages({
    "any.required": "Pickup Address is required",
  }),
  notes: Joi.string().optional().allow(""),
  latitude: Joi.number().required().messages({
    "any.required": "Latitude is required",
  }),
  longitude: Joi.number().required().messages({
    "any.required": "Longitude is required",
  }),
  condition: Joi.string().valid("PROPER", "MIXED", "CONTAMINATED").required(),
});

export const handlePickupRequest = [
  upload.single("photo"),
  async (req: MulterRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      let photoUrl: string | null = null;
      if (req.file) {
        const fileSizeMB = req.file.size / (1024 * 1024);
        if (fileSizeMB > 5) {
          return res.status(400).json({ error: "File must be under 5MB" });
        }
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(req.file.originalname);
        const filename = uniqueSuffix + ext;
        const uploadDir = path.join(
          process.cwd(),
          "..",
          "frontend",
          "public",
          "uploads",
        );
        const uploadPath = path.join(uploadDir, filename);
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        fs.writeFileSync(uploadPath, req.file.buffer);
        photoUrl = `/uploads/${filename}`;
      }
      const requestData = {
        userId,
        wasteType: value.wasteType,
        estimatedWeight: value.estimatedWeight,
        pickupAddress: value.pickupAddress,
        notes: value.notes || "",
        photoUrl,
        condition: value.condition,
        rateApplied: 0,
        latitude: value.latitude,
        longitude: value.longitude,
      };
      const createdRequest = await pickupRequest.createPickupRequest(
        requestData,
        req,
      );

      const pickupAddressData = {
        address: value.pickupAddress,
        userId: userId,
        latitude: value.latitude,
        longitude: value.longitude,
      };

      const existingAddress = await prisma.address.findFirst({
        where: {
          userId: pickupAddressData.userId,
          address: pickupAddressData.address, 
          latitude: pickupAddressData.latitude,
          longitude: pickupAddressData.longitude,
        },
      });

      if (!existingAddress) {
        const newAddress = await pickupRequest.savedAddresses(
          pickupAddressData,
          req,
        );
      }


      const wasteType = value.wasteType;
      const requestId = createdRequest.requestId;

      const assignPickupRequest = await pickupRequest.assignWorker(
        userId,
        wasteType,
        requestId,
        req,
      );

      return res.status(201).json({
        message: "Pickup request created successfully",
      });
    } catch (err) {
      console.error("Pickup Request Error", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
];
