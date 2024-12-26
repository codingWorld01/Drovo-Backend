import express from "express"
import { getUserProfile, loginUser, registerUser, sendOtp, verifyOtp } from "../controller/User_Controller.js"

const userRouter = express.Router();

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.get("/profile", getUserProfile);
userRouter.post("/send-otp", sendOtp);
userRouter.post("/verify-otp", verifyOtp);

export default userRouter;