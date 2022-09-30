import loadBusData from "./jobs/loadBusData.js";
import loadStopTimings from "./jobs/loadStopTimings.js"
import mongoose from 'mongoose'
const connection = await mongoose.connect(process.env.MONGOURI as string);

loadBusData()
loadStopTimings(10*60000)
