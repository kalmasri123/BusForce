export interface BusData {
    buses:          { [key: string]: Bus[] };
    excludedRoutes: number[];
    time:           { [key: string]: string };
}

export interface Bus {
    deviceId:         number;
    created:          string;
    createdTime:      string;
    paxLoad:          number;
    bus:              string;
    busId:            number;
    userId:           string;
    routeBlockId:     string;
    latitude:         string;
    longitude:        string;
    calculatedCourse: null | string;
    outOfService:     number;
    more:             null;
    createdDebug:     string;
    totalCap:         number;
    color:            string;
    busName:          string;
    busType:          string;
    routeId:          string;
    route:            string;
    outdated:         number;
}
