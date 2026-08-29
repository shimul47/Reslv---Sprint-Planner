import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { awardPoints } from "./controllers/loyaltyController.js";

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const ticket = await mongoose.connection.collection("tickets").findOne({ ticketNumber: "TKT-92291" });
  const feedback = await mongoose.connection.collection("feedbacks").findOne({ ticketId: ticket._id });
  
  try {
    const res = await awardPoints(ticket.companyId, 25, `Received 5-star feedback on ticket ${ticket.ticketNumber}`, feedback.agentId);
    console.log("Award points result:", res);
  } catch (err) {
    console.error("Error in awardPoints:", err);
  }
  
  process.exit(0);
}).catch(console.error);
