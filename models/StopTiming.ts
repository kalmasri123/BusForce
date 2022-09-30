import mongoose from "mongoose";
const schema = new mongoose.Schema({
  timeStamp: Date,
  timeTaken:Number,
  loadChange:Number,
  routeId: Number,
  busNumber:String,
  fromStop:String,
  toStop:String
});
schema.index({ busNumber: 1, timeStamp: -1 }, { unique: true });

export default mongoose.model("StopTiming", schema);
