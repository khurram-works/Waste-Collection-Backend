import { Router } from "express";
import { handleUserLogin, handleUserSignup } from "../Controllers/user";
import { getZones } from "../Controllers/getZones";
import { handleRefreshToken } from "../Controllers/refreshToken";
import { handleLogout } from "../Controllers/logout";

const authRouter = Router();

authRouter.post("/register", handleUserSignup);
authRouter.get("/zones", getZones);
authRouter.post("/login", handleUserLogin);
authRouter.post("/refresh", handleRefreshToken);
authRouter.post("/logout", handleLogout);

export default authRouter;