const mongoose = require("mongoose");
const AnalyticsEvent = require("../models/analyticsEventModel");
const { findBuilder } = require("../analytics/eventBuilders");

// Logs every API call as an analytics event in MongoDB.
// The event is written AFTER the response is sent and without "await",
// so analytics never slows down or breaks the API.
module.exports = (req, res, next) => {
    // CORS preflight requests are not real API calls
    if (req.method === "OPTIONS") return next();

    const startedAt = new Date();

    // Remember what the API sends back, builders use it
    // (e.g. the id of a created product or whether login succeeded)
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        res.locals.responseBody = body;
        return originalJson(body);
    };

    // "finish" fires when the response has been fully sent to the client
    res.on("finish", () => {
        // MongoDB is not connected -> skip quietly, the API keeps working
        if (mongoose.connection.readyState !== 1) return;

        try {
            const url = req.originalUrl.split("?")[0];
            const { endpoint, params, build } = findBuilder(req.method, url);
            const body = res.locals.responseBody;
            const ok = res.statusCode >= 200 && res.statusCode < 300;

            const event = {
                endpoint,
                timestamp: startedAt,
                statusCode: res.statusCode,
                durationMs: Date.now() - startedAt.getTime(),
                ...build({ req, res, params, body, ok })
            };

            // No await: fire and forget, just log if saving fails
            AnalyticsEvent.create(event).catch((error) => {
                console.error("Analytics: failed to save event:", error.message);
            });
        } catch (error) {
            console.error("Analytics: failed to build event:", error.message);
        }
    });

    next();
};
