import cors from "cors"
import dotenv from "dotenv"
import express from "express"

import { errorHandler } from "./middleware/errorHandler"
import activityRoutes from "./routes/activities"
import animationRoutes from "./routes/animations"
import authRoutes from "./routes/auth"
import checklistRoutes from "./routes/checklists"
import expenseRoutes from "./routes/expenses"
import highlightsRoutes from "./routes/highlights"
import packingRoutes from "./routes/packing"
import scenarioRoutes from "./routes/scenarios"
import transportRoutes from "./routes/transport"
import tripRoutes from "./routes/trips"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Trip Explorer API v2" })
})

// API routes
app.use("/api/auth", authRoutes)
app.use("/api/trips", tripRoutes)
app.use("/api/activities", activityRoutes)
app.use("/api/transport", transportRoutes)
app.use("/api/animations", animationRoutes)
app.use("/api/expenses", expenseRoutes)
app.use("/api/checklists", checklistRoutes)
app.use("/api/packing", packingRoutes)
app.use("/api/scenarios", scenarioRoutes)
app.use("/api/highlights", highlightsRoutes)

// Error handling
app.use(errorHandler)

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`)
})
