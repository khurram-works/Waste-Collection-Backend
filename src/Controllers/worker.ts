import e from "express";
import Joi from "joi";
import { WorkerService } from "../models/newWorker";
import { auditLogger } from "../utils/auditLogger";

const workerService = new WorkerService();
const addWorkerSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string()
    .allow(null)
    .max(20)
    .pattern(
      /^[+]?[(]?[0-9]{1,4}[)]?[-\s]?[(]?[0-9]{1,4}[)]?[-\s]?[0-9]{1,6}[-\s]?[0-9]{1,6}$/,
    )
    .message("Please enter a valid phone number"),
  zoneId: Joi.number().required(),
  vehicle: Joi.string().required(),
  assignedRoute: Joi.string().required(),
  status: Joi.string().required(),
  password: Joi.string()
    .min(8)
    .pattern(/[A-Z]/, { name: "uppercase letter" })
    .pattern(/[!@#$%^&*(),.?":{}|<>]/, "special character")
    .required(),
});


export async function addWorker(req: e.Request, res:e.Response){
  try{
    const{error, value} = addWorkerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    const { name, email, phone, zoneId, vehicle, assignedRoute, status, password  } = value;
    const existingWorker = await workerService.findWorkerByEmail(email);
    if (existingWorker) {
      return res.status(400).json({ error: "Worker already registered." });
    }

    const newWorker = await workerService.createWorker(
      name,
      email,
      phone,
      zoneId,
      vehicle,
      assignedRoute,
      status,
      password,
      req
    );

    res.status(201).json({
      message: "User created Successfully",
      worker: {
        userId: newWorker.userId,
        name: newWorker.name,
        email: newWorker.email,
        role: newWorker.role,
        status: newWorker.status,
      },
    })

  }catch (err) {
    console.error("Error during creating Worker:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}


