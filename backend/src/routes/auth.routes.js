const { Router } = require('express')
const {registerUserController,loginUserController,getMeController,logoutUserController} = require("../controller/auth.controller")
const { authUser } = require("../middleware/auth.middleware")

const authRouter = Router()


authRouter.post("/register", registerUserController)



authRouter.post("/login", loginUserController)



authRouter.get("/logout", logoutUserController)


authRouter.get("/get-me", authUser, getMeController)


module.exports = authRouter