import express from "express";
import authnticate from "../middleware/authentication.js";
import { login, refesh, register } from "../controllers/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", authnticate, refesh);

export default router;
