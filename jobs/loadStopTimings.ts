import mongoose from "mongoose";
import fetch from "node-fetch";
import dotenv from "dotenv";
import BusSnapshot, { Snapshot } from "../models/BusSnapshot.js";
import StopTiming from "../models/StopTiming.js";

import * as url from "node:url";
import { ApplicationCommandPermissionType } from "discord.js";

dotenv.config();
const stops: any = await (
  await fetch(
    "https://passio3.com/www/mapGetData.php?getStops=2&deviceId=3367966&withOutdated=1&wBounds=1&showBusInOos=0&lat=35.3016724&lng=-80.7364558&wTransloc=1",
    {
      headers: {
        accept: "application/json, text/javascript, */*; q=0.01",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        Referer: "https://passiogo.com/",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      body: `json=${encodeURIComponent('{"s0":"1053","sA":1}')}`,
      method: "POST",
    }
  )
).json();
function degreesToRadians(degrees: number) {
  var pi = Math.PI;
  return degrees * (pi / 180);
}
/** i didnt make this */
function measureDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  // generally used geo measurement function
  var R = 6378.137; // Radius of earth in KM
  var dLat = (lat2 * Math.PI) / 180 - (lat1 * Math.PI) / 180;
  var dLon = (lon2 * Math.PI) / 180 - (lon1 * Math.PI) / 180;
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return d * 1000; // meters
}
const EARTH_RADIUS = 6_371_000;

/**Checks if bus is at a valid stop. Returns null if not.**/
const getCurrentStop = async (snapshot: Snapshot) => {
  const routeStops: (string | number)[] = stops.routes[`${snapshot.routeId}`]
    .slice(3)
    .map((el: string | number[]) => el[1]);
  const stopId = routeStops.find((stop) => {
    const currentStop = stops.stops[`ID${stop}`];
    const course = snapshot.course;

    const latDiff = snapshot.lat - currentStop.latitude;
    const lngDiff = snapshot.lng - currentStop.longitude;

    const distance = measureDistance(
      snapshot.lat,
      snapshot.lng,
      currentStop.latitude,
      currentStop.longitude
    );
    const cosCourse = Math.cos(degreesToRadians( course-90));
    const sinCourse = Math.sin(degreesToRadians( course-90));

    if (distance < 70 && cosCourse * latDiff >= 0 && sinCourse * lngDiff >= 0) {
      return currentStop
    }
    // console.log(latDiff, lngDiff);
  });
  return stops.stops[`ID${stopId}`]
};
const calculateTiming = async (busNumber: string) => {
  const maxTimeStampQuery = await StopTiming.find({ busNumber })
    .sort({ timeStamp: -1 })
    .limit(1);
  //Lowest timestamp to search for to avoid recalculating
  const snapshots = await BusSnapshot.find({
    busNumber,
    lastUpdated: {
      $gte: maxTimeStampQuery.length > 0 ? maxTimeStampQuery[0].timeStamp : 0,
    },
  }).sort({ lastUpdated: 1 });
  let stopA:any = null;
  let snapshotA:Snapshot;
  // let stopB:any = null;
  snapshots.forEach(async (snapshot, i) => {
    const stopCheck:any = await getCurrentStop(snapshot)
    
    if (!stopA && stopCheck) {
      console.log("FIRST STOP")
      stopA = stopCheck;
      snapshotA = snapshot;

      console.log(stopA)
      console.log(snapshotA)


      return;
    }
    if(stopA && stopCheck && stopCheck.stopId != stopA?.stopId){
      console.log(stopA.name)
      
      stopA = stopCheck;
      console.log(stopA.name)

      console.log("TIME DIFF:\t",snapshot.lastUpdated.getTime()-snapshotA.lastUpdated.getTime())
      // console.log(stopA)
      // console.log(snapshot)


      snapshotA = snapshot;
    }
  });
};
async function run() {
  //Get all existing bus numbers. this is used to group and to not block entire job
  const items = await BusSnapshot.distinct("busNumber");
  await Promise.all([items[1]].map(calculateTiming));
}
export default async function runPeriodically(seconds: number = 5) {
  let running = false;
  await run();
  setInterval(async () => {
    if (!running) {
      //Prevents job overlap
      running = true;
      await run();
      running = false;
    }
  }, seconds * 1000);
}
if (import.meta.url.startsWith("file:")) {
  const connection = await mongoose.connect(process.env.MONGOURI as string);

  const modulePath = url.fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    await runPeriodically(60000);
  }
}
