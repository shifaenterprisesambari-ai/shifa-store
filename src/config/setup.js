import AdminJS from "adminjs";
import AdminJSFastify from "@adminjs/fastify";
import * as AdminJSMongoose from "@adminjs/mongoose";
import * as Models from "../models/index.js";
import { authenticate, COOKIE_PASSWORD, sessionStore } from "./config.js";
import { dark, light, noSidebar } from "@adminjs/themes";

AdminJS.registerAdapter(AdminJSMongoose)

export const admin = new AdminJS({
  resources: [
    {
      resource: Models.Customer,
      options: {
        listProperties: ["name", "email", "plainPassword", "phone", "role", "isActivated"],
        filterProperties: ["email", "phone", "role"],
        properties: {
          password: { isVisible: { list: false, show: false, edit: true, filter: false } },
          plainPassword: { isVisible: { list: true, show: true, edit: false, filter: false } },
        },
      },
    },
    {
      resource: Models.DeliveryPartner,
      options: {
        listProperties: ["name", "email", "plainPassword", "phone", "role", "isActivated", "isAvailable"],
        filterProperties: ["email", "role", "isAvailable"],
        properties: {
          password: { isVisible: { list: false, show: false, edit: true, filter: false } },
          plainPassword: { isVisible: { list: true, show: true, edit: false, filter: false } },
        },
      },
    },
    {
      resource: Models.Admin,
      options: {
        listProperties: ["email", "role", "isActivated"],
        filterProperties: ["email", "role"],
      },
    },
    {
      resource: Models.ShopOwner,
      options: {
        listProperties: ["name", "email", "plainPassword", "phone", "role", "isActivated"],
        filterProperties: ["email", "role"],
        properties: {
          password: { isVisible: { list: false, show: false, edit: true, filter: false } },
          plainPassword: { isVisible: { list: true, show: true, edit: false, filter: false } },
        },
      },
    },
    { resource: Models.Branch },
    { resource: Models.Product },
    { resource: Models.Category },
    { resource: Models.Order },
    { resource: Models.Counter },
    {
      resource: Models.Notification,
      options: {
        listProperties: ["recipientModel", "title", "type", "isRead", "createdAt"],
        filterProperties: ["recipientModel", "type", "isRead"],
      },
    },
  ],
  branding: {
    companyName: "Shifa Store",
    withMadeWithLove: false,
  },
  defaultTheme: dark.id,
  availableThemes: [dark, light, noSidebar],
  rootPath: '/admin'
})

export const buildAdminRouter = async (app) => {
  await AdminJSFastify.buildAuthenticatedRouter(
    admin,
    {
      authenticate,
      cookiePassword: COOKIE_PASSWORD,
      cookieName: 'adminjs'
    },
    app,
    {
      store: sessionStore,
      saveUninitialized: false,
      secret: COOKIE_PASSWORD,
      cookie: {
        httpOnly: process.env.NODE_ENV === "production",
        secure: process.env.NODE_ENV === "production",
      },
    }
  )
}