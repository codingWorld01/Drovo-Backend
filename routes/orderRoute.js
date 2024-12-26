import express from "express"
import authMiddleware from "../middlewares/auth.js"
import { listOrders, placeOrder, updateStatus, userOrders } from "../controller/orderController.js"
import shopAuthMiddleware from "../middlewares/shopAuthMiddleware.js";

const orderRouter = express.Router();

orderRouter.post("/place", authMiddleware, placeOrder);
orderRouter.post("/userorders", authMiddleware, userOrders);
orderRouter.get("/list", shopAuthMiddleware, listOrders);
orderRouter.post("/status", updateStatus);

export default orderRouter;