import { Router } from "express";
import { authenticateToken } from "../Middlewares/auth";
import {addWorker} from "../Controllers/worker";
import { manageRequests } from "../Controllers/manageRequests";
import { assignWorker } from "../Controllers/assignWorker";
import { getWorkers, updateWorker } from "../Controllers/Workers";
import { deleteWorker } from "../Controllers/Workers";
import { allWithdrawalRequests } from "../Controllers/allWithdrawalRequests";
import { approveWithdrawalRequest } from "../Controllers/approveWithdrawalRequest";
import { rejectWithdrawalRequest } from "../Controllers/rejectWithdrawalRequest";
import {auditLogs} from "../Controllers/auditLogs";
import { reports } from "../Controllers/reports";
import { dashboardData } from "../Controllers/adminDashboardData";
import { generatePdf } from "../Controllers/generatePdf";




const adminRouter = Router();
adminRouter.use(authenticateToken);
adminRouter.post("/worker", addWorker);
adminRouter.get('/manage', manageRequests);
adminRouter.patch('/manage/:requestId', assignWorker);
adminRouter.get('/worker', getWorkers);
adminRouter.patch('/worker/:workerId', updateWorker);
adminRouter.delete('/worker/:workerId', deleteWorker);
adminRouter.get('/withdrawal', allWithdrawalRequests);
adminRouter.get('/audit-logs', auditLogs);
adminRouter.patch('/withdrawal/:id', approveWithdrawalRequest);
adminRouter.patch('/withdrawal/reject/:id', rejectWithdrawalRequest);
adminRouter.get("/reports", reports);
adminRouter.get("/dashboard", dashboardData);
adminRouter.post("/generate-pdf", generatePdf);



export default adminRouter;