import e from "express";
import { Userservice } from "../models/newuser";
import Joi from "joi";
import bcrypt from "bcrypt";
import { setupJWT } from "../service/auth";
import { prisma } from "../../lib/prisma";
import { auditLogger } from "../utils/auditLogger";
import {
  setAccessTokenCookie,
  setRefreshTokenCookie,
} from "../utils/authCookies";


const userService = new Userservice();

const signupSchema = Joi.object({
  name: Joi.string().min(3).required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .pattern(/[A-Z]/, { name: "uppercase letter" })
    .pattern(/[!@#$%^&*(),.?":{}|<>]/, "special character")
    .required(),
  address: Joi.string().required(),
  zoneId: Joi.number().required(),
  latitude: Joi.number().required(),
  longitude: Joi.number().required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .pattern(/[A-Z]/, { name: "uppercase letter" })
    .pattern(/[!@#$%^&*(),.?":{}|<>]/, "special character")
    .required(),
});

export async function handleUserSignup(req: e.Request, res: e.Response) {
  try {
    const { error, value } = signupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, email, password, address, zoneId, latitude, longitude } = value;

    const existingUser = await userService.findUserByEmail(email);

    if (existingUser) {
      return res.status(400).json({ error: "Email already registered." });
    }

    const newUser = await userService.createUser(
      name,
      email,
      password,
      address,
      zoneId,
      req
    );
    const UserId = Number(newUser.userId);
    const userAddress = await prisma.address.create({
      data:{
        userId: UserId,
        address: address,
        latitude: latitude,
        longitude: longitude,
        updatedAt: new Date()
      }
    })
    
    return res.status(201).json({
      message: "User created Successfully",
      user: {
        userId: newUser.userId,
        name: newUser.name,
        email: newUser.email,
        address: newUser.address,
        role: newUser.role,
        status: newUser.status,
        zoneId: newUser.zoneId,
      },
    });
  } catch (err) {
    console.error("Error during user signup:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function handleUserLogin(req: e.Request, res: e.Response){
  try{
    const {error, value} = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    const {email, password} = value;

    const user = await userService.findUserByEmail(email);
    if(!user){
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    await prisma.user.update({
      where:{userId:user.userId},
      data:{status:"ACTIVE"}
    })

    const { token, refreshToken } = setupJWT(user);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.userId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    setAccessTokenCookie(res, token);
    setRefreshTokenCookie(res, refreshToken);

    await auditLogger({
      userId: user.userId,
      userRole: user.role,
      action: "LOGIN",
      targetType: "USER",
      targetId: String(user.userId),
      status: "SUCCESS",
      req,
    });

    return res.status(200).json({
      message: "Login successful",
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        address: user.address,
      },
    });
  
  }catch(err){
    await auditLogger({
      action: "LOGIN",
      targetType: "USER",
      status: "FAILED",
      req
    }).catch(() => {});
    console.error("Error occured while logging in.");
    return res.status(500).json({ error: "Internal server error" });
  }
}
