import loadBusData from "./jobs/loadBusData.js";
setInterval(async () => {
    await loadBusData()
},5000);
