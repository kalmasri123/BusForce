import mongoose from "mongoose";
import fetch from "node-fetch";
import dotenv from "dotenv";
import BusSnapshot, { Snapshot } from "../models/BusSnapshot.js";
import StopTiming from "../models/StopTiming.js";

import * as url from "node:url";
import { createWriteStream, fstat } from "node:fs";
import Nullable from "./types/Nullable.js";

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
  const latDiffMeters = Math.abs(lat1 - lat2) * 111.32 * 1000;
  const lngDiffMeters =
    Math.abs(
      (lon1 - lon2) * 40075 * 1000 * Math.cos(degreesToRadians(lat1 - lat2))
    ) / 360;
  return (latDiffMeters + lngDiffMeters) / 2;
  // return { width: latDiffMeters, height: lngDiffMeters };
}
const EARTH_RADIUS = 6_371_000;

/**Checks if bus is at a valid stop. Returns null if not.**/
const getCurrentStop = (snapshot: Snapshot, previousStop: any) => {
  // console.log(stops.routes)
  if(!stops.routes[`${snapshot.routeId}`]){
    return null;
  }
  const routeStops: (string | number)[][] =
    stops.routes[`${snapshot.routeId}`].slice(3);
  const stopsFound = routeStops
    .filter((stop, i) => {
      const currentStop: any = stops.stops[`ID${stop[1]}`];
      //stop[0] = position
      if (previousStop) {
        // console.log(previousStop);
      }
      if (previousStop) {
        const previousIndex = routeStops.findIndex(
          (el) => previousStop.id == el[1]
        );
        {
          if (
            previousStop.id == currentStop.id ||
            (previousIndex > i && previousIndex < routeStops.length - 1) ||
            i - previousIndex > 1
          )
            return false;
        }
      }
      const diff = measureDistance(
        snapshot.lat,
        snapshot.lng,
        currentStop.latitude,
        currentStop.longitude
      );

      if (diff <= 45) {
        console.log("IS AT STOP")
        return true;  
      }
      return false;
    })
    .map((el) => el[1]);
  const distances: number[] = [];
  const minDistance = Math.min(
    ...stopsFound
      .map((el) => stops.stops[`ID${el}`])
      .map((el) => {
        const dist = measureDistance(
          snapshot.lat,
          snapshot.lng,
          el.latitude,
          el.longitude
        );
        distances.push(dist);
        return dist;
      })
  );
  // console.log(stops.stops[
  //   `ID${stopsFound.find((el, i) => distances[i] == minDistance)}`
  // ])
  return stops.stops[
    `ID${stopsFound.find((el, i) => distances[i] == minDistance)}`
  ];
};
const calculateTiming = async (busNumber: string) => {
  const maxTimeStampQuery = await StopTiming.find({ busNumber })
    .sort({ timeStamp: -1 })
    .limit(1);
  //Lowest timestamp to search for to avoid recalculating
  const snapshots = BusSnapshot.find({
    busNumber,
    lastUpdated: {
      $gte: maxTimeStampQuery.length > 0 ? maxTimeStampQuery[0].timeStamp : 0,
    },
  }).sort({ lastUpdated: 1 });
  let stopA: any = null;
  let snapshotA: Nullable<Snapshot> = null;
  // let stopB:any = null;
  for await (const snapshot of snapshots.cursor()){
    const stopCheck: any = getCurrentStop(snapshot, stopA);

    if (!stopA && stopCheck) {
      console.log("FIRST STOP");
      stopA = stopCheck;
      snapshotA = snapshot;
      // console.log(180 - snapshot.course - 90);
      // console.log(stopA);
      // console.log(snapshotA);

      continue;
    }
    if (stopA && stopCheck && stopCheck.stopId != stopA?.stopId) {

      const comparedSnapshot = snapshotA as Snapshot
      let timeTaken =
        snapshot.lastUpdated.getTime() - comparedSnapshot.lastUpdated.getTime();
      let timeStamp = new Date(snapshot.lastUpdated);
      let busNumber = snapshot.busNumber;
      let routeId = snapshot.routeId;
      let loadChange = snapshot.currentLoad - comparedSnapshot.currentLoad;
      // console.log("Inserting",timeTaken)
      const stopTiming = await new StopTiming({
        timeStamp,
        busNumber,
        loadChange,
        timeTaken,
        routeId,
        fromStop:stopA.stopId,
        toStop:stopCheck.stopId
      });
      await stopTiming
        .save()
        .catch((err) =>
          console.log("An error has occurred validation: %s", err.message)
        );
      snapshotA = snapshot;
      // console.log(stopA.name);

      stopA = stopCheck;
      // console.log(stopA.name);
     
    }
  };
};
async function run() {
  //Get all existing bus numbers. this is used to group and to not block entire job
  const items = await BusSnapshot.distinct("busNumber");
  await Promise.all(items.map(calculateTiming));
  for(let item of items){
    await calculateTiming(item)
  }
}
export default async function runPeriodically(seconds: number = 600000) {
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
