// import "dotenv/config";
// import fastifySession from "@fastify/session";
// import ConnectMongoDBSession from "connect-mongodb-session";
// import { Admin } from "../models/index.js";


// export const PORT = process.env.PORT || 3000;
// export const COOKIE_PASSWORD = process.env.COOKIE_PASSWORD;

// const MongoDBStore = ConnectMongoDBSession(fastifySession)

// export const sessionStore = new MongoDBStore({
//     uri:process.env.MONGO_URI,
//     collection:"sessions"
// })

// sessionStore.on('error',(error)=>{
//     console.log("Session store error",error)
// })

// export const authenticate =async(email,password)=>{

//     //  UNCOMMENT THIS WHEN CREATING ADMIN  FIRST TIME

//     // if(email && password){
//     //     if(email=='rmuktanur@gmail.com' && password==="12345678"){
//     //         return Promise.resolve({ email: email, password: password }); 
//     //     }else{
//     //         return null
//     //     }
//     // }


//     // UNCOMMENT THIS WHEN ALREADY CREATED ADMIN ON DATABASE

//     if(email && password){
//         const user = await Admin.findOne({email});
//         if(!user){
//             return null
//         }
//         if(user.password===password){
//             return Promise.resolve({ email: email, password: password }); 
//         }else{
//             return null
//         }
//     }
    

//     return null
// }


import "dotenv/config";
import { Admin } from "../models/index.js";

export const PORT = process.env.PORT || 3000;

// MUST be 32+ characters
export const COOKIE_PASSWORD =
  process.env.COOKIE_PASSWORD ||
  "this_is_a_very_long_secure_cookie_password_123456";

// AdminJS authentication
export const authenticate = async (email, password) => {
  if (!email || !password) return null;

  const user = await Admin.findOne({ email });

  if (!user) return null;

  // ⚠️ Plain text for now (replace with bcrypt later)
  if (user.password === password) {
    return {
      email: user.email,
      role: user.role,
    };
  }

  return null;
};
