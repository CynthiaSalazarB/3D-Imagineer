/**
 * Seeds the two read-only demo accounts documented in the README.
 *
 *   node scripts/seedDemoUsers.js
 *
 * Safe to run more than once: existing accounts are skipped, not overwritten.
 * Passwords are hashed by the pre("save") hook on userModel.
 */

const path = require("path");
const mongoose = require("mongoose");

require("dotenv").config({ path: path.join(__dirname, "../config/.env") });

const userModel = require("../models/userModel");

const DEMO_USERS = [
    {
        firstName: "Demo",
        lastName: "Clerk",
        email: "clerk@demo.3dimagineer.app",
        password: "DemoClerk2026",
        role: "clerk"
    },
    {
        firstName: "Demo",
        lastName: "Customer",
        email: "customer@demo.3dimagineer.app",
        password: "DemoCustomer2026",
        role: "customer"
    }
];

async function main() {
    if (!process.env.MONGODB_CONNECTION_STRING) {
        console.error("MONGODB_CONNECTION_STRING is not set in config/.env");
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_CONNECTION_STRING);
    console.log("Connected to MongoDB");

    // Accounts created before `role` existed on the schema have no role at all,
    // which would leave them unable to reach either side. Default them to customer.
    const backfilled = await userModel.updateMany(
        { role: { $exists: false } },
        { $set: { role: "customer" } }
    );
    if (backfilled.modifiedCount > 0) {
        console.log(`backfill ${backfilled.modifiedCount} existing user(s) to role "customer"`);
    }

    for (const demo of DEMO_USERS) {
        const existing = await userModel.findOne({ email: demo.email });

        if (existing) {
            console.log(`skip   ${demo.email} (already exists)`);
            continue;
        }

        await new userModel(demo).save();
        console.log(`create ${demo.email}`);
    }

    await mongoose.disconnect();
    console.log("Done.");
}

main().catch(err => {
    console.error("Seeding failed:", err);
    process.exit(1);
});
