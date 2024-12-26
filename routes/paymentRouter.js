import express from "express"
import { createRenewalOrder, shopPayment, verifyPayment, verifyRenewalPayment } from "../controller/paymentController.js";
import upload from "../config/multerConfig.js";

const paymentRouter = express.Router();

paymentRouter.post("/create-order", shopPayment);
paymentRouter.post("/verify", upload.single("shopImage"), verifyPayment);
paymentRouter.post("/createRenewalOrder", createRenewalOrder);
paymentRouter.post("/verifyRenewalPayment", verifyRenewalPayment);

export default paymentRouter;
