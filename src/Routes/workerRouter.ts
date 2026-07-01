import { Router } from "express";
import { authenticateToken } from "../Middlewares/auth";
import { getTasks, taskhistory } from "../Controllers/Tasks";
import { updateTask } from "../Controllers/updateTask";
import {updateStatus} from "../Controllers/updateStatus"
import { setWorkerInactive } from "../Controllers/setWorkerInactive";
import { updateCitizenProfile } from "../Controllers/updateCitizenProfile";
import { updatePassword } from "../Controllers/updatePassword";
import { deleteCitizenAccount } from "../Controllers/deleteCitizenAccount";
import { requireRole } from "../Middlewares/roles";

const workerRouter = Router();
workerRouter.use(authenticateToken, requireRole("WORKER"));
workerRouter.get("/", getTasks);
workerRouter.patch("/status/:requestId", updateStatus);
workerRouter.get("/taskhistory", taskhistory);
workerRouter.put("/status", setWorkerInactive);
workerRouter.patch("/update/profile", updateCitizenProfile);
workerRouter.patch("/update-password", updatePassword);
workerRouter.delete("/delete", deleteCitizenAccount);
workerRouter.patch("/:requestId", updateTask);


export default workerRouter;