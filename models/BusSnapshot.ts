import mongoose from "mongoose";
const schema = new mongoose.Schema({
  lat: Number,
  lng: Number,
  course: Number,
  lastUpdated: Date,
  busCode: String,
  maxLoad: Number,
  currentLoad: Number,
  routeId: Number,
  busNumber:String
});
schema.index({ busNumber: 1, lastUpdated: 1 }, { unique: true });

export default mongoose.model("BusSnapshot", schema);
