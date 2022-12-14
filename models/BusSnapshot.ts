import mongoose from "mongoose";
export interface Snapshot{
  lat: number,
  lng: number,
  course: number,
  lastUpdated: Date,
  maxLoad: number,
  currentLoad: number,
  routeId: number,
  busNumber:string
}
const schema = new mongoose.Schema({
  lat: Number,
  lng: Number,
  course: Number,
  lastUpdated: Date,
  maxLoad: Number,
  currentLoad: Number,
  routeId: Number,
  busNumber:String
});
schema.index({ busNumber: 1, lastUpdated: 1 }, { unique: true });

export default mongoose.model<Snapshot>("BusSnapshot", schema);
