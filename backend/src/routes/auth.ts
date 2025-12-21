import express from "express"

import { signup, login } from "../controllers/AuthController"
import { googleAuth } from "../controllers/GoogleAuthController"

const router = express.Router()

router.post("/signup", signup)
router.post("/login", login)
router.post("/google", googleAuth)

export default router
