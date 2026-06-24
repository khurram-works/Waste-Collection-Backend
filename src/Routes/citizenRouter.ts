import { Router } from "express";
import { authenticateToken } from "../Middlewares/auth";
import { citizenDashboardData } from "../Controllers/citizenData";
import { handlePickupRequest } from "../Controllers/pickuprequest";
import { allPickupRequests } from "../Controllers/allPickupRequests";
import { getSavedAddresses } from "../Controllers/savedAdresses";
import { getTransactions } from "../Controllers/getTransactions";
import { withdrawalRequest } from "../Controllers/handleWithdrawRequest";
import { updateCitizenProfile } from "../Controllers/updateCitizenProfile";
import { updatePassword } from "../Controllers/updatePassword";
import { setCitizenInactive } from "../Controllers/setCitizenInactive";
import { deleteCitizenAccount } from "../Controllers/deleteCitizenAccount";


const citizenRouter = Router();
citizenRouter.use(authenticateToken);
citizenRouter.get("/", citizenDashboardData);
citizenRouter.post("/request", handlePickupRequest);
citizenRouter.post("/withdraw", withdrawalRequest);
citizenRouter.get("/request/:userId", getSavedAddresses);
citizenRouter.get("/status",allPickupRequests);
citizenRouter.get('/transaction/:userId', getTransactions);
citizenRouter.put("/update-password", updatePassword);
citizenRouter.patch("/update/profile", updateCitizenProfile);
citizenRouter.put("/status",setCitizenInactive);
citizenRouter.delete("/delete",deleteCitizenAccount);


export default citizenRouter;