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

    try {
        // 1. Check if the admin exists in the database
        const adminUser = await Admin.findOne({ email });
        if (adminUser) {
            let isMatch = false;
            if (adminUser.password && adminUser.password.startsWith("$2")) {
                isMatch = await bcrypt.compare(password, adminUser.password);
            } else {
                isMatch = password === adminUser.password;
            }

            if (isMatch) {
                return { email: adminUser.email, password: password };
            }
        }
    } catch (error) {
        console.error("Admin DB authentication error:", error);
    }

    // 2. Fallback: hardcoded credentials for first-time login/bootstrap
    if (email === 'shifaenterprisesambari@gmail.com' && password === "Shifa@2025") {
        return { email: email, password: password };
    }

    return null;
}
