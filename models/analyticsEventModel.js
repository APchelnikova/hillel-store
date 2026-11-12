const mongoose = require("mongoose");

// One collection for all analytics events.
// Only a couple of fields are fixed; everything else depends on the endpoint
// (see analytics/eventBuilders.js), so every event type has its own shape.
const analyticsEventSchema = new mongoose.Schema(
    {
        endpoint: { type: String, required: true }, // e.g. "POST /api/auth/login"
        timestamp: { type: Date, default: Date.now }
    },
    {
        strict: false,                  // allow any extra fields and nesting
        collection: "analytics_events", // exact collection name (no auto-pluralizing)
        versionKey: false,              // no "__v" field, we never update events
        minimize: false                 // keep empty objects ({}) instead of dropping them silently
    }
);

// Typical analytics query: "events of endpoint X for the last N days"
analyticsEventSchema.index({ endpoint: 1, timestamp: -1 });

module.exports = mongoose.model("AnalyticsEvent", analyticsEventSchema);
