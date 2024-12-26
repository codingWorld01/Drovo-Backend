import express from "express";
import { fetchAllShops, findShop, shopDetails } from "../controller/shopController.js";
import shopAuthMiddleware from "../middlewares/shopAuthMiddleware.js";

const shopRouter = express.Router();

shopRouter.get("/all", fetchAllShops);
shopRouter.get("/details", shopAuthMiddleware, shopDetails);
shopRouter.get("/:shopId", findShop);

export default shopRouter;