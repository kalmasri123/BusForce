import mongoose from "mongoose";
import fetch from "node-fetch";
import { BusData } from "./types/BusData.js";
import dotenv from "dotenv";
import BusSnapshot from "../models/BusSnapshot.js";
import * as url from "node:url";

dotenv.config();
async function run() {
  const response = await fetch(
    "https://passio3.com/www/mapGetData.php?getBuses=1&deviceId=3367966&wTransloc=1",
    {
      headers: {
        accept: "application/json, text/javascript, */*; q=0.01",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
      },
      referrer: "https://passiogo.com/",
      referrerPolicy: "strict-origin-when-cross-origin",
      body: `json=${encodeURIComponent(
        '{"s0":"1053","sA":1,"rA":8,"r0":"3201","r1":"22940","r2":"26308","r3":"3406","r4":"16380","r5":"22939","r6":"26294","r7":"31969"}'
      )}`,
      method: "POST",
    }
  );
  const jsonResponse = (await response.json()) as BusData;
  const buses = Object.values(jsonResponse["buses"]).flat();
  console.log(buses);
  await Promise.all(
    buses.map(
      async ({
        latitude,
        longitude,
        calculatedCourse,
        bus,
        paxLoad,
        totalCap,
        routeId,
        createdDebug,
      }) => {
        console.log(bus);
        const snapshot = await new BusSnapshot({
          lat: latitude,
          lng: longitude,
          course: calculatedCourse,
          lastUpdated: new Date(createdDebug),
          busNumber: bus,
          maxLoad: totalCap,
          currentLoad: paxLoad,
          routeId,
        });
        await snapshot
          .save()
          .catch((err) =>
            console.log("An error has occurred validation: %s", err.message)
          );
      }
    )
  );
}
export default function runPeriodically(
  seconds: number = 5
) {
  setInterval(async () => {
    await run();
  }, seconds * 1000);
}
if (import.meta.url.startsWith("file:")) {
  const connection = await mongoose.connect(process.env.MONGOURI as string);

  const modulePath = url.fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    await runPeriodically();
  }
}
