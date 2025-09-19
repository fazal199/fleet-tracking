const express = require('express');
const cors = require("cors");
const { createServer } = require('http');
const { Server } = require('socket.io');
const fs = require("fs");
const db = require("./db/index.js");
const { formatDateToIST, convertISOToISTFormatted } = require("./utils/utils.js")

require("dotenv").config();


const CORS_OPTIONS = {
    origin: process.env.FRONTEND_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: "Content-Type,Authorization"
};

// console.log(CORS_OPTIONS);
const app = express();
const PORT = process.env.PORT || 3001;
const server = createServer(app);

const io = new Server(server, {
    cors: CORS_OPTIONS
});

// Middleware
app.use(express.json())
app.use(cors(CORS_OPTIONS));

// socket io
io.on('connection', (socket) => {
    socket.emit("welcome-message", { message: "Welcome Man!" })
});

// Root route
app.get('/', (req, res) => {
    res.send('Express server is running');
});

//route to get the recent data of tracker
app.get("/last-trackderdata", async function (req, res) {
    const dbresponse = await db.query("select * from gpsdata order by gps_time desc limit 1;");

    const trackerdata = dbresponse.rows[0];
    const status = JSON.parse(trackerdata?.status_json);

    const lockRope = status.lockRope === 1 || status.lockRope === "1" ? "Pull out" : "Inserting";
    const lockState = status.lockStatus === 1 || status.lockStatus === "1" ? "Seal" : "Unseal";

    const voltage = trackerdata.voltage;
    const batteryPercent = trackerdata.battery == 255 ? "Charging" : trackerdata.battery;

    const expandInfo = JSON.parse(trackerdata.expand_info);
    const temperature = expandInfo.temperature;

    //FIXME: Need Alarm Data
    const backCover = "Open"; // placeholder

    //FIXME: Need Geolocation Api
    const deviceAddress = "No Location, Enable Billing for Geocoding Api";


    lastStateRes = await db.query(
        "SELECT last_state_changed_time FROM gpsdata WHERE last_state_changed_time IS NOT NULL ORDER BY last_state_changed_time DESC LIMIT 1"
    );

    let runDuration = "Not Available";

    let stateChangedTime = lastStateRes.rows[0].last_state_changed_time || null;

    if (stateChangedTime) {

        const lastTime = new Date(stateChangedTime);

        const now = new Date(); // Current time
        let diffSeconds = Math.floor((now.getTime() - lastTime.getTime()) / 1000);
        if (diffSeconds < 0) diffSeconds = 0;

        const days = Math.floor(diffSeconds / 86400);
        const hours = Math.floor((diffSeconds % 86400) / 3600);
        const minutes = Math.floor((diffSeconds % 3600) / 60);

        const durationParts = [];
        if (days > 0) durationParts.push(`${days}d`);
        if (hours > 0) durationParts.push(`${hours}h`);
        if (minutes > 0 || durationParts.length === 0) durationParts.push(`${minutes}min`);

        runDuration = durationParts.join(" ");
    }

    const finalTrackderData = {
        truckId: trackerdata.asset_id,
        lockState,
        voltage: `${voltage}V`,
        battery: `${batteryPercent === "Charging" ? "Charging" : `${batteryPercent}%`}`,
        gpsTime: process.env.NODE_ENV == "dev" ? convertISOToISTFormatted(trackerdata.gps_time) : trackerdata.gps_time,
        temperature,
        latitude: Number(trackerdata.latitude),
        longitude: Number(trackerdata.longitude),

        runStatus: `${trackerdata.speed > 0 ? "Driving" : "Parking"}【${runDuration}】`,
        latLong: `${trackerdata.latitude}, ${trackerdata.longitude}`,
        status: `Lock rope: ${lockRope}; Lock State: ${lockState}; Back cover: ${backCover}; LBS: ${trackerdata.cells};`,
        location: deviceAddress
    };

    res.status(200).json({
        trackerdata: finalTrackderData
    })
})

//route for chinese server positional data
app.post("/gpsdata", async (req, res) => {
    const data = { ...req.body };
    const logTime = formatDateToIST(new Date());

    // Log request
    console.log(`\n\n=== New Request at ${logTime} (IST) ===\n${JSON.stringify(data, null, 2)}\n`);


    // Convert gpsTime / recvTime to IST
    if (data.gpsTime) {
        try {
            data.gpsTime = convertISOToISTFormatted(data.gpsTime, "Asia/Kolkata");
        } catch { }
    }

    if (data.recvTime) {
        try {
            data.recvTime = convertISOToISTFormatted(data.recvTime, "Asia/Kolkata");
        } catch { }
    }

    try {
        // Get last record to compare status
        const lastRes = await db.query(
            "SELECT gps_time, speed, last_state_changed_time FROM gpsdata ORDER BY created_at DESC LIMIT 1"
        );

        const prevRow = lastRes.rows[0];
        const prevStatus = prevRow ? (prevRow.speed > 0 ? "Driving" : "Parking") : null;
        const newStatus = data.speed > 0 ? "Driving" : "Parking";

        // Determine last_state_changed_time
        let stateChangedTime = null;
        if (prevStatus !== newStatus) {
            stateChangedTime = data.gpsTime; // status actually changed
        }

        //Inserting India Current time in created_at
        const currentIndianTiming = convertISOToISTFormatted(new Date(Date.now()).toISOString())

        // Insert data into DB
        const insertQuery = `
        INSERT INTO gpsdata (
          asset_id, battery, cell_signal, cells, direction, expand_info, gnss_signal,
          gps_time, latitude, longitude, loc_type, mileage, recv_time, speed,
          status_json, voltage, last_state_changed_time,created_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,
          $8,$9,$10,$11,$12,$13,$14,
          $15,$16,$17,$18
        )`;


        try {
            await db.query(insertQuery, [
                data.assetId,
                data.battery,
                data.cellSignal,
                data.cells,
                data.direction,
                data.expandInfo,
                data.gnssSignal,
                data.gpsTime,
                data.latitude,
                data.longitude,
                data.locType,
                data.mileage,
                data.recvTime,
                data.speed,
                data.statusJson,
                data.voltage,
                stateChangedTime,
                currentIndianTiming
            ]);
        } catch (error) {
            console.log("Something went wrong while inserting chinese server positional data! place: index.js route:/gpsdata", error.message);
            res.status(500).json({ message: `Something went wrong while inserting chinese server positional data! place: index.js route:/gpsdata ${error.message}`})
        }



        let lastStateRes;

        if (!stateChangedTime) {

            lastStateRes = await db.query(
                "SELECT last_state_changed_time FROM gpsdata WHERE last_state_changed_time IS NOT NULL ORDER BY last_state_changed_time DESC LIMIT 1"
            );
        }

        let runDuration = "0min";

        stateChangedTime = stateChangedTime || lastStateRes.rows[0].last_state_changed_time;


        if (stateChangedTime) {


            const lastTime = new Date(stateChangedTime);


            const now = new Date(); // Current time
            let diffSeconds = Math.floor((now.getTime() - lastTime.getTime()) / 1000);
            if (diffSeconds < 0) diffSeconds = 0;

            const days = Math.floor(diffSeconds / 86400);
            const hours = Math.floor((diffSeconds % 86400) / 3600);
            const minutes = Math.floor((diffSeconds % 3600) / 60);


            const durationParts = [];
            if (days > 0) durationParts.push(`${days}d`);
            if (hours > 0) durationParts.push(`${hours}h`);
            if (minutes > 0 || durationParts.length === 0) durationParts.push(`${minutes}min`);

            runDuration = durationParts.join(" ");
        }


        // Human readable output
        const status = JSON.parse(data.statusJson) || {};
        const expandInfo = JSON.parse(data.expandInfo) || {};
        const lockRope = status.lockRope === 1 || status.lockRope === "1" ? "Pull out" : "Inserting";
        const lockState = status.lockStatus === 1 || status.lockStatus === "1" ? "Seal" : "Unseal";

        const temperature = expandInfo.temperature && expandInfo.temperature !== "-1000.0" ? expandInfo.temperature : "N/A";

        //FIXME: Need Alarm Data
        const backCover = "Open"; // placeholder
        const lbs = data.cells ?? "N/A";
        const batteryPercent = (data.battery == "255" ? "Charging" : data.battery) || 0;
        const voltage = data.voltage ?? "0.0";

        //FIXME: Need Geolocation Api
        const deviceAddress = "No Location, Enable Billing for Geocoding Api";

        const humanReadable = {
            truckId: data.assetId,
            lockState,
            voltage: `${voltage}V`,
            battery: `${batteryPercent === "Charging" ? "Charging" : `${batteryPercent}%`}`,
            gpsTime: data.gpsTime,
            temperature,
            latitude: data.latitude,
            longitude: data.longitude,
            runStatus: `${newStatus}【${runDuration}】`,
            latLong: `${data.latitude}, ${data.longitude}`,
            status: `Lock rope: ${lockRope}; Lock State: ${lockState}; Back cover: ${backCover}; LBS: ${lbs};`,
            location: deviceAddress
        };

        //sending data through websockets!
        io.emit("trackerdata", { trackerdata: humanReadable });

        return res.json({
            status: "success",
            timestamp: logTime,
            received: data,
            humanReadable
        });

    } catch (err) {
        console.error("Something Went wrong while handling the gpsdata! place: index.js route: app.post('/gpsdata')", err.message);
        return res.status(500).json({ status: "error", msg: "DB operation failed", err });
    }
});

//route for chinese server event data
app.post("/eventdata", async (req, res) => {
    const data = { ...req.body };
    const logTime = formatDateToIST(new Date());

    // Log request
    console.log(`\n\n=== New Request at ${logTime} (IST) ===\n${JSON.stringify(data, null, 2)}\n`);

    //checking if whether the device is lock or unlock
    const currentStatus = data.eventType == 1 ? "unlock" : "lock";

    const insertquery = `INSERT INTO lock_unlock_data (event_type, event_time, device_id)
            VALUES ($1, $2, $3);`;

    try {
        await db.query(insertquery, [
            currentStatus,
            convertISOToISTFormatted(data.dateTime, "Asia/Kolkata"),
            data.assetId
        ])
    } catch (err) {
        console.error("Something Went wrong while handling the eventdata! place: index.js route: app.post('/eventdata')", err.message);
        return res.status(500).json({ status: "error", msg: "DB operation failed", err });
    }

    return res.json({
        status: "success",
        timestamp: logTime,
        received: data,
    });


});

//route to get devices report
app.get("/getdevices-report", async function (req, res) {

    const fromdate = req.query.fromdate || "";
    const todate = req.query.todate || "";
    let devicesreportquery, dbresponse;

    if (fromdate && todate) {
        devicesreportquery = `SELECT
        device_id,
        SUM(CASE WHEN LOWER(TRIM(event_type)) = 'lock' THEN 1 ELSE 0 END)   AS lock_times,
        SUM(CASE WHEN LOWER(TRIM(event_type)) = 'unlock' THEN 1 ELSE 0 END) AS unlock_times
      FROM lock_unlock_data
      WHERE event_time BETWEEN $1 AND $2
      GROUP BY device_id;`

        dbresponse = await db.query(devicesreportquery, [
            req.query.fromdate,
            req.query.todate,
        ]);

    }

    else {
        devicesreportquery = `SELECT
        device_id,
        SUM(CASE WHEN LOWER(TRIM(event_type)) = 'lock' THEN 1 ELSE 0 END)   AS lock_times,
        SUM(CASE WHEN LOWER(TRIM(event_type)) = 'unlock' THEN 1 ELSE 0 END) AS unlock_times
      FROM lock_unlock_data
      GROUP BY device_id;`;

        dbresponse = await db.query(devicesreportquery);

    }

    const lock_unlock_data = dbresponse.rows.length > 0 ? dbresponse.rows : [];

    res.status(200).json({
        success: true,
        statusCode: 200,
        message: "devices lock and unlock report sent!",
        lock_unlock_data,
    })
})


// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
});

server.listen(PORT, () => {
    console.log(`Server is Now Running or Listening!`);
});

process.on("SIGINT", () => {
    console.log("Shutting down server...");
    db.end();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    console.log("Received SIGTERM. Initiating graceful shutdown...");
    try {
        await db.end();
        console.log("Database pool closed successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Error closing database pool during SIGTERM:", err);
        process.exit(1); // Exit with an error code if pool closing fails
    }
});
