import "dotenv/config";
import fastifySession from "@fastify/session";
import ConnectMongoDBSession from "connect-mongodb-session";
import { Admin } from "../models/index.js";
import bcrypt from "bcryptjs";


export const PORT = process.env.PORT || 3000;
export const COOKIE_PASSWORD = process.env.COOKIE_PASSWORD;

const MongoDBStore = ConnectMongoDBSession(fastifySession)

export const sessionStore = new MongoDBStore({
    uri: process.env.MONGO_URI,
    collection: "sessions"
})

sessionStore.on('error', (error) => {
    console.log("Session store error", error)
})

export const authenticate = async (email, password) => {
    if (!email || !password) return null;

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    try {
        // 1. Check if the admin exists in the database (case-insensitive email)
        const adminUser = await Admin.findOne({ email: { $regex: new RegExp(`^${cleanEmail}$`, "i") } });
        if (adminUser) {
            let isMatch = false;
            if (adminUser.password && adminUser.password.startsWith("$2")) {
                isMatch = await bcrypt.compare(cleanPassword, adminUser.password);
            } else {
                isMatch = cleanPassword === adminUser.password;
            }

            if (isMatch) {
                // Restrict AdminJS panel access to Master Admin only (branch must be null)
                if (adminUser.branch) {
                    console.warn(`Admin ${cleanEmail} belongs to a branch. AdminJS panel is for Master Admin only.`);
                    return null;
                }
                return { email: adminUser.email, password: cleanPassword, branch: null };
            }
        }
    } catch (error) {
        console.error("Admin DB authentication error:", error);
    }

    // 2. Fallback: hardcoded credentials for first-time login/bootstrap
    if (cleanEmail === 'shifaenterprisesambari@gmail.com' && cleanPassword === "Shifa@2025") {
        return { email: cleanEmail, password: cleanPassword };
    }

    return null;
}
