import AdminJS from "adminjs";
import AdminJSFastify from "@adminjs/fastify";
import * as AdminJSMongoose from "@adminjs/mongoose";
import * as Models from "../models/index.js";
import { authenticate, COOKIE_PASSWORD, sessionStore } from "./config.js";
import { dark, light, noSidebar } from "@adminjs/themes";

AdminJS.registerAdapter(AdminJSMongoose)

const filterByBranchHook = async (request, context) => {
  const currentAdmin = context.currentAdmin;
  if (currentAdmin && currentAdmin.branch) {
    request.query = request.query || {};
    request.query.filter = request.query.filter || {};
    request.query.filter.branch = currentAdmin.branch.toString();
  }
  return request;
};

const filterBranchSelfHook = async (request, context) => {
  const currentAdmin = context.currentAdmin;
  if (currentAdmin && currentAdmin.branch) {
    request.query = request.query || {};
    request.query.filter = request.query.filter || {};
    request.query.filter._id = currentAdmin.branch.toString();
  }
  return request;
};

const saveBranchHook = async (request, context) => {
  const currentAdmin = context.currentAdmin;
  if (currentAdmin && currentAdmin.branch) {
    if (request.payload) {
      request.payload.branch = currentAdmin.branch.toString();
    }
  }
  return request;
};

export const admin = new AdminJS({
  resources: [
    {
      resource: Models.Customer,
      options: {
        actions: {
          list: { before: filterByBranchHook },
          search: { before: filterByBranchHook },
          new: { before: saveBranchHook },
          edit: { before: saveBranchHook },
        },
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
        actions: {
          list: { before: filterByBranchHook },
          search: { before: filterByBranchHook },
          new: { before: saveBranchHook },
          edit: { before: saveBranchHook },
        },
        listProperties: ["idNumber", "name", "email", "plainPassword", "phone", "role", "isActivated", "isAvailable"],
        filterProperties: ["idNumber", "email", "role", "isAvailable"],
        properties: {
          idNumber: { label: "ID Number", isTitle: true },
          password: { isVisible: { list: false, show: false, edit: true, filter: false } },
          plainPassword: { isVisible: { list: true, show: true, edit: false, filter: false } },
        },
      },
    },
    {
      resource: Models.Admin,
      options: {
        listProperties: ["email", "role", "isActivated", "branch"],
        filterProperties: ["email", "role"],
      },
    },
    {
      resource: Models.ShopOwner,
      options: {
        actions: {
          list: { before: filterByBranchHook },
          search: { before: filterByBranchHook },
          new: { before: saveBranchHook },
          edit: { before: saveBranchHook },
        },
        listProperties: ["idNumber", "name", "email", "shopName", "commissionPercentage", "phone", "role", "isActivated"],
        showProperties: ["idNumber", "name", "email", "shopName", "commissionPercentage", "shopImage", "shopAddress", "phone", "role", "branch", "isActivated"],
        editProperties: ["idNumber", "name", "email", "password", "shopName", "commissionPercentage", "shopImage", "shopAddress", "phone", "branch", "isActivated"],
        filterProperties: ["idNumber", "email", "role", "shopName"],
        properties: {
          idNumber: { label: "ID Number", isTitle: true },
          password: { isVisible: { list: false, show: false, edit: true, filter: false } },
          plainPassword: { isVisible: { list: true, show: true, edit: false, filter: false } },
          shopName: { label: "Store Name" },
          shopImage: { label: "Store Photo URL" },
          shopAddress: { label: "Store Address" },
          commissionPercentage: { type: "number", label: "Site Owner Profit Cut (%)" },
        },
      },
    },
    {
      resource: Models.Branch,
      options: {
        actions: {
          list: { before: filterBranchSelfHook },
          search: { before: filterBranchSelfHook },
        },
        listProperties: ["name", "image", "address", "commissionPercentage"],
        showProperties: ["name", "image", "address", "commissionPercentage", "location.latitude", "location.longitude", "shopOwner", "deliveryPartners"],
        editProperties: ["name", "image", "address", "commissionPercentage", "location.latitude", "location.longitude"],
        properties: {
          image: { label: "Branch Image URL" },
          commissionPercentage: { type: "number", label: "Site Owner Profit Cut (%)" },
          "location.latitude": { type: "number", label: "Latitude" },
          "location.longitude": { type: "number", label: "Longitude" },
        }
      }
    },
    {
      resource: Models.Product,
      options: {
        actions: {
          list: { before: filterByBranchHook },
          search: { before: filterByBranchHook },
          new: { before: saveBranchHook },
          edit: { before: saveBranchHook },
        },
        listProperties: ["name", "shop", "category", "price", "stockQuantity", "isEnabled", "isAvailable", "branch"],
        showProperties: ["name", "shop", "category", "price", "discountPrice", "quantity", "stockQuantity", "isEnabled", "isAvailable", "description", "image", "branch"],
        editProperties: ["name", "shop", "category", "price", "discountPrice", "quantity", "stockQuantity", "isEnabled", "isAvailable", "description", "image", "images", "branch"],
        filterProperties: ["shop", "category", "isEnabled", "isAvailable", "branch"],
        properties: {
          shop: {
            reference: "ShopOwner",
            label: "Shop Owner",
            isVisible: { list: true, show: true, edit: true, filter: true },
          },
          image: { label: "Main Image URL" },
        },
      },
    },
    { resource: Models.Category },
    {
      resource: Models.Order,
      options: {
        actions: {
          list: { before: filterByBranchHook },
          search: { before: filterByBranchHook },
          new: { before: saveBranchHook },
          edit: { before: saveBranchHook },
        }
      }
    },
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
      saveUninitialized: true,
      secret: COOKIE_PASSWORD,
      cookie: {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      },
    }
  )
}
