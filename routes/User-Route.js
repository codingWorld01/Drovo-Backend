import express from "express"
import { getUserProfile, googleLogin, googleRegister, loginUser, registerUser, sendOtp, verifyOtp } from "../controller/User_Controller.js"

const userRouter = express.Router();

userRouter.post("/register", registerUser);
userRouter.post("/register-google", googleRegister);
userRouter.post("/login", loginUser);
userRouter.post("/login/google", googleLogin);
userRouter.get("/profile", getUserProfile);
userRouter.post("/send-otp", sendOtp);
userRouter.post("/verify-otp", verifyOtp);

export default userRouter;