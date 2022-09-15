import loadBusData from "./jobs/loadBusData.js";
import mongoose from 'mongoose'
const connection = await mongoose.connect(process.env.MONGOURI as string);

loadBusData()
