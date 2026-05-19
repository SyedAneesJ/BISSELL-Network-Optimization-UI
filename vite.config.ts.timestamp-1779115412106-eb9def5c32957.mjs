var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// public/manifest.json
var require_manifest = __commonJS({
  "public/manifest.json"(exports, module) {
    module.exports = {
      name: "Network Optimization UI",
      version: "1.0.0",
      size: {
        width: 4,
        height: 3
      },
      fileName: "manifest.json",
      allowPopups: true,
      datasetsMapping: [],
      collectionsMapping: [
        {
          name: "comparision_scenarios",
          schema: {
            columns: [
              { name: "id", type: "STRING" },
              { name: "kind", type: "STRING" },
              { name: "comparisonId", type: "STRING" },
              { name: "notificationId", type: "STRING" },
              { name: "ownerUserId", type: "STRING" },
              { name: "ownerUserName", type: "STRING" },
              { name: "ownerUserEmail", type: "STRING" },
              { name: "status", type: "STRING" },
              { name: "isPublished", type: "STRING" },
              { name: "payload", type: "STRING" },
              { name: "createdAt", type: "DATETIME" },
              { name: "updatedAt", type: "DATETIME" }
            ]
          },
          syncEnabled: true
        },
        {
          name: "custom_scenarios",
          schema: {
            columns: [
              { name: "id", type: "STRING" },
              { name: "kind", type: "STRING" },
              { name: "scenarioId", type: "STRING" },
              { name: "scenarioName", type: "STRING" },
              { name: "status", type: "STRING" },
              { name: "region", type: "STRING" },
              { name: "scenarioType", type: "STRING" },
              { name: "ownerUserId", type: "STRING" },
              { name: "ownerUserName", type: "STRING" },
              { name: "ownerUserEmail", type: "STRING" },
              { name: "isPublished", type: "STRING" },
              { name: "isArchived", type: "STRING" },
              { name: "payload", type: "STRING" },
              { name: "createdAt", type: "DATETIME" },
              { name: "updatedAt", type: "DATETIME" },
              { name: "deletedAt", type: "DATETIME" },
              { name: "searchText", type: "STRING" }
            ]
          },
          syncEnabled: true
        },
        {
          name: "custom_scenario_lanes",
          schema: {
            columns: [
              { name: "id", type: "STRING" },
              { name: "kind", type: "STRING" },
              { name: "scenarioId", type: "STRING" },
              { name: "scenarioName", type: "STRING" },
              { name: "chunkIndex", type: "LONG" },
              { name: "chunkCount", type: "LONG" },
              { name: "laneCount", type: "LONG" },
              { name: "payload", type: "STRING" },
              { name: "createdAt", type: "DATETIME" },
              { name: "updatedAt", type: "DATETIME" },
              { name: "deletedAt", type: "DATETIME" },
              { name: "searchText", type: "STRING" }
            ]
          },
          syncEnabled: true
        },
        {
          name: "notification",
          schema: {
            columns: [
              { name: "id", type: "STRING" },
              { name: "kind", type: "STRING" },
              { name: "notificationId", type: "STRING" },
              { name: "recipientUserId", type: "STRING" },
              { name: "recipientUserEmail", type: "STRING" },
              { name: "status", type: "STRING" },
              { name: "payload", type: "STRING" },
              { name: "createdAt", type: "DATETIME" },
              { name: "updatedAt", type: "DATETIME" }
            ]
          },
          syncEnabled: true
        }
      ],
      packagesMapping: [
        {
          name: "DOMO DataFlows",
          alias: "dataflowstatus",
          packageId: "fd94540a-8c94-4d8c-af0f-8b149138add0",
          parameters: [
            {
              name: "dataFlowId",
              displayName: "dataFlowId",
              type: "text",
              value: null,
              nullable: false,
              isList: false,
              children: [],
              entitySubType: null,
              alias: "dataFlowId"
            }
          ],
          output: {
            name: "result",
            displayName: "result",
            type: "text",
            value: null,
            nullable: true,
            isList: false,
            children: [],
            entitySubType: null,
            alias: "result"
          },
          version: "2.0.13",
          functionName: "getDataflowExecutionsStatus"
        },
        {
          name: "DOMO DataFlows",
          alias: "dataflowmetadata",
          packageId: "fd94540a-8c94-4d8c-af0f-8b149138add0",
          parameters: [
            {
              name: "dataFlowId",
              displayName: "dataFlowId",
              type: "text",
              value: null,
              nullable: false,
              isList: false,
              children: [],
              entitySubType: null,
              alias: "dataFlowId"
            }
          ],
          output: {
            name: "result",
            displayName: "result",
            type: "object",
            value: null,
            nullable: true,
            isList: false,
            children: [],
            entitySubType: null,
            alias: "result"
          },
          version: "2.0.13",
          functionName: "getDataFlowMetadata"
        },
        {
          name: "DOMO DataFlows",
          alias: "startdataflow",
          packageId: "fd94540a-8c94-4d8c-af0f-8b149138add0",
          parameters: [
            {
              name: "dataFlowId",
              displayName: "dataFlowId",
              type: "text",
              value: null,
              nullable: false,
              isList: false,
              children: [],
              entitySubType: null,
              alias: "dataFlowId"
            }
          ],
          output: {
            name: "result",
            displayName: "result",
            type: "object",
            value: null,
            nullable: true,
            isList: false,
            children: [],
            entitySubType: null,
            alias: "result"
          },
          version: "2.0.13",
          functionName: "startDataFlow"
        },
        {
          name: "DOMO DataFlows",
          alias: "dataflowlogic",
          packageId: "fd94540a-8c94-4d8c-af0f-8b149138add0",
          parameters: [
            {
              name: "dataFlowId",
              displayName: "dataFlowId",
              type: "text",
              value: null,
              nullable: false,
              isList: false,
              children: [],
              entitySubType: null,
              alias: "dataFlowId"
            }
          ],
          output: {
            name: "result",
            displayName: "result",
            type: "object",
            value: null,
            nullable: true,
            isList: false,
            children: [],
            entitySubType: null,
            alias: "result"
          },
          version: "2.0.13",
          functionName: "extractDataflowLogic"
        },
        {
          name: "DOMO Notifications",
          alias: "sendEmail",
          packageId: "03ba6971-98d0-4654-9bfd-aa897816df33",
          parameters: [
            {
              name: "recipientEmails",
              displayName: "recipientEmails",
              type: "text",
              value: null,
              nullable: true,
              isList: false,
              children: [],
              entitySubType: null,
              alias: "recipientEmails"
            },
            {
              name: "subject",
              displayName: "subject",
              type: "text",
              value: null,
              nullable: false,
              isList: false,
              children: [],
              entitySubType: null,
              alias: "subject"
            },
            {
              name: "body",
              displayName: "body",
              type: "text",
              value: null,
              nullable: true,
              isList: false,
              children: [],
              entitySubType: null,
              alias: "body"
            },
            {
              name: "personRecipients",
              displayName: "personRecipients",
              type: "user",
              value: null,
              nullable: true,
              isList: true,
              children: [],
              entitySubType: null,
              alias: "personRecipients"
            },
            {
              name: "groupRecipients",
              displayName: "groupRecipients",
              type: "group",
              value: null,
              nullable: true,
              isList: true,
              children: [],
              entitySubType: null,
              alias: "groupRecipients"
            },
            {
              name: "attachments",
              displayName: "attachments",
              type: "number",
              value: null,
              nullable: true,
              isList: true,
              children: [],
              entitySubType: null,
              alias: "attachments"
            },
            {
              name: "attachment",
              displayName: "attachment",
              type: "number",
              value: null,
              nullable: true,
              isList: false,
              children: [],
              entitySubType: null,
              alias: "attachment"
            },
            {
              name: "includeReplyAll",
              displayName: "includeReplyAll",
              type: "boolean",
              value: null,
              nullable: true,
              isList: false,
              children: [],
              entitySubType: null,
              alias: "includeReplyAll"
            }
          ],
          output: {
            name: "result",
            displayName: "result",
            type: "boolean",
            value: null,
            nullable: true,
            isList: false,
            children: [],
            entitySubType: null,
            alias: "result"
          },
          version: "2.1.13",
          functionName: "sendEmail"
        }
      ],
      workflowMapping: [
        {
          alias: "testEmail",
          version: "1.0.1",
          parameters: [
            {
              name: "recipientEmails",
              aliasedName: "recipientEmails",
              type: "text",
              list: false,
              children: []
            },
            {
              name: "subject",
              aliasedName: "subject",
              type: "text",
              list: false,
              children: []
            },
            {
              name: "body",
              aliasedName: "body",
              type: "text",
              list: false,
              children: []
            },
            {
              name: "scenarioId",
              aliasedName: "scenarioId",
              type: "text",
              list: false,
              children: []
            },
            {
              name: "dataflowId",
              aliasedName: "dataflowId",
              type: "text",
              list: false,
              children: []
            },
            {
              name: "executionId",
              aliasedName: "executionId",
              type: "text",
              list: false,
              children: []
            },
            {
              name: "triggeredByUserId",
              aliasedName: "triggeredByUserId",
              type: "text",
              list: false,
              children: []
            },
            {
              name: "triggeredByDisplayName",
              aliasedName: "triggeredByDisplayName",
              type: "text",
              list: false,
              children: []
            },
            {
              name: "completedAt",
              aliasedName: "completedAt",
              type: "text",
              list: false,
              children: []
            }
          ]
        },
        {
          alias: "sendEmail",
          parameters: [
            {
              name: "recipientEmails",
              aliasedName: "recipientEmails",
              type: "text",
              list: false,
              children: []
            },
            {
              name: "subject",
              aliasedName: "subject",
              type: "text",
              list: false,
              children: []
            },
            {
              name: "body",
              aliasedName: "body",
              type: "text",
              list: false,
              children: []
            },
            {
              name: "scenarioId",
              aliasedName: "scenarioId",
              type: "text",
              list: false,
              children: []
            },
            {
              name: "dataflowId",
              aliasedName: "dataflowId",
              type: "text",
              list: false,
              children: []
            },
            {
              name: "executionId",
              aliasedName: "executionId",
              type: "text",
              list: false,
              children: []
            },
            {
              name: "triggeredByUserId",
              aliasedName: "triggeredByUserId",
              type: "text",
              list: false,
              children: []
            },
            {
              name: "triggeredByDisplayName",
              aliasedName: "triggeredByDisplayName",
              type: "text",
              list: false,
              children: []
            },
            {
              name: "completedAt",
              aliasedName: "completedAt",
              type: "text",
              list: false,
              children: []
            }
          ]
        }
      ],
      proxy: [
        {
          method: "POST",
          route: "/dataprocessing",
          target: "https://bissell.domo.com/api/dataprocessing/v1"
        },
        {
          method: "GET",
          route: "/dataprocessing",
          target: "https://bissell.domo.com/api/dataprocessing/v1"
        }
      ],
      id: "6a475f08-6fa5-4e7d-b691-dac67c6bf17a"
    };
  }
});

// src/setupProxy.js
var setupProxy_exports = {};
__export(setupProxy_exports, {
  default: () => setupProxy_default
});
import { Proxy as Proxy2 } from "file:///D:/Downloads/sb1-tppgsm2z/node_modules/@domoinc/ryuu-proxy/dist/index.js";
function setupProxy_default(app) {
  app.use(ryuuProxy.express());
}
var manifest, config, ryuuProxy;
var init_setupProxy = __esm({
  async "src/setupProxy.js"() {
    try {
      const manifestModule = await Promise.resolve().then(() => __toESM(require_manifest(), 1));
      manifest = manifestModule.default;
    } catch (err) {
      console.warn("Could not load manifest.json");
      manifest = { name: "BISSELL Network Optimization UI", version: "1.0.0" };
    }
    config = { manifest };
    ryuuProxy = new Proxy2(config);
  }
});

// vite.config.ts
import { defineConfig } from "file:///D:/Downloads/sb1-tppgsm2z/node_modules/vite/dist/node/index.js";
import react from "file:///D:/Downloads/sb1-tppgsm2z/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath, URL } from "url";
var __vite_injected_original_import_meta_url = "file:///D:/Downloads/sb1-tppgsm2z/vite.config.ts";
var vite_config_default = defineConfig({
  base: "./",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url))
    }
  },
  plugins: [
    react(),
    {
      name: "configure-server",
      async configureServer(server) {
        try {
          const { default: setupProxy } = await init_setupProxy().then(() => setupProxy_exports);
          setupProxy(server.middlewares);
        } catch (err) {
          console.warn("setupProxy not found, skipping");
        }
      }
    },
    {
      name: "copy-manifest",
      closeBundle() {
        if (!existsSync("./dist")) {
          mkdirSync("./dist", { recursive: true });
        }
        try {
          copyFileSync("./public/manifest.json", "./dist/manifest.json");
          console.log("\u2713 Copied manifest.json to dist");
        } catch (err) {
          console.error("Failed to copy manifest.json:", err);
        }
      }
    }
  ],
  optimizeDeps: {
    exclude: ["lucide-react"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsicHVibGljL21hbmlmZXN0Lmpzb24iLCAic3JjL3NldHVwUHJveHkuanMiLCAidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIntcbiAgXCJuYW1lXCI6IFwiTmV0d29yayBPcHRpbWl6YXRpb24gVUlcIixcbiAgXCJ2ZXJzaW9uXCI6IFwiMS4wLjBcIixcbiAgXCJzaXplXCI6IHtcbiAgICBcIndpZHRoXCI6IDQsXG4gICAgXCJoZWlnaHRcIjogM1xuICB9LFxuICBcImZpbGVOYW1lXCI6IFwibWFuaWZlc3QuanNvblwiLFxuICBcImFsbG93UG9wdXBzXCI6IHRydWUsXG4gIFwiZGF0YXNldHNNYXBwaW5nXCI6IFtdLFxuICBcImNvbGxlY3Rpb25zTWFwcGluZ1wiOiBbXG4gICAge1xuICAgICAgXCJuYW1lXCI6IFwiY29tcGFyaXNpb25fc2NlbmFyaW9zXCIsXG4gICAgICBcInNjaGVtYVwiOiB7XG4gICAgICAgIFwiY29sdW1uc1wiOiBbXG4gICAgICAgICAgeyBcIm5hbWVcIjogXCJpZFwiLCBcInR5cGVcIjogXCJTVFJJTkdcIiB9LFxuICAgICAgICAgIHsgXCJuYW1lXCI6IFwia2luZFwiLCBcInR5cGVcIjogXCJTVFJJTkdcIiB9LFxuICAgICAgICAgIHsgXCJuYW1lXCI6IFwiY29tcGFyaXNvbklkXCIsIFwidHlwZVwiOiBcIlNUUklOR1wiIH0sXG4gICAgICAgICAgeyBcIm5hbWVcIjogXCJub3RpZmljYXRpb25JZFwiLCBcInR5cGVcIjogXCJTVFJJTkdcIiB9LFxuICAgICAgICAgIHsgXCJuYW1lXCI6IFwib3duZXJVc2VySWRcIiwgXCJ0eXBlXCI6IFwiU1RSSU5HXCIgfSxcbiAgICAgICAgICB7IFwibmFtZVwiOiBcIm93bmVyVXNlck5hbWVcIiwgXCJ0eXBlXCI6IFwiU1RSSU5HXCIgfSxcbiAgICAgICAgICB7IFwibmFtZVwiOiBcIm93bmVyVXNlckVtYWlsXCIsIFwidHlwZVwiOiBcIlNUUklOR1wiIH0sXG4gICAgICAgICAgeyBcIm5hbWVcIjogXCJzdGF0dXNcIiwgXCJ0eXBlXCI6IFwiU1RSSU5HXCIgfSxcbiAgICAgICAgICB7IFwibmFtZVwiOiBcImlzUHVibGlzaGVkXCIsIFwidHlwZVwiOiBcIlNUUklOR1wiIH0sXG4gICAgICAgICAgeyBcIm5hbWVcIjogXCJwYXlsb2FkXCIsIFwidHlwZVwiOiBcIlNUUklOR1wiIH0sXG4gICAgICAgICAgeyBcIm5hbWVcIjogXCJjcmVhdGVkQXRcIiwgXCJ0eXBlXCI6IFwiREFURVRJTUVcIiB9LFxuICAgICAgICAgIHsgXCJuYW1lXCI6IFwidXBkYXRlZEF0XCIsIFwidHlwZVwiOiBcIkRBVEVUSU1FXCIgfVxuICAgICAgICBdXG4gICAgICB9LFxuICAgICAgXCJzeW5jRW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcIm5hbWVcIjogXCJjdXN0b21fc2NlbmFyaW9zXCIsXG4gICAgICBcInNjaGVtYVwiOiB7XG4gICAgICAgIFwiY29sdW1uc1wiOiBbXG4gICAgICAgICAgeyBcIm5hbWVcIjogXCJpZFwiLCBcInR5cGVcIjogXCJTVFJJTkdcIiB9LFxuICAgICAgICAgIHsgXCJuYW1lXCI6IFwia2luZFwiLCBcInR5cGVcIjogXCJTVFJJTkdcIiB9LFxuICAgICAgICAgIHsgXCJuYW1lXCI6IFwic2NlbmFyaW9JZFwiLCBcInR5cGVcIjogXCJTVFJJTkdcIiB9LFxuICAgICAgICAgIHsgXCJuYW1lXCI6IFwic2NlbmFyaW9OYW1lXCIsIFwidHlwZVwiOiBcIlNUUklOR1wiIH0sXG4gICAgICAgICAgeyBcIm5hbWVcIjogXCJzdGF0dXNcIiwgXCJ0eXBlXCI6IFwiU1RSSU5HXCIgfSxcbiAgICAgICAgICB7IFwibmFtZVwiOiBcInJlZ2lvblwiLCBcInR5cGVcIjogXCJTVFJJTkdcIiB9LFxuICAgICAgICAgIHsgXCJuYW1lXCI6IFwic2NlbmFyaW9UeXBlXCIsIFwidHlwZVwiOiBcIlNUUklOR1wiIH0sXG4gICAgICAgICAgeyBcIm5hbWVcIjogXCJvd25lclVzZXJJZFwiLCBcInR5cGVcIjogXCJTVFJJTkdcIiB9LFxuICAgICAgICAgIHsgXCJuYW1lXCI6IFwib3duZXJVc2VyTmFtZVwiLCBcInR5cGVcIjogXCJTVFJJTkdcIiB9LFxuICAgICAgICAgIHsgXCJuYW1lXCI6IFwib3duZXJVc2VyRW1haWxcIiwgXCJ0eXBlXCI6IFwiU1RSSU5HXCIgfSxcbiAgICAgICAgICB7IFwibmFtZVwiOiBcImlzUHVibGlzaGVkXCIsIFwidHlwZVwiOiBcIlNUUklOR1wiIH0sXG4gICAgICAgICAgeyBcIm5hbWVcIjogXCJpc0FyY2hpdmVkXCIsIFwidHlwZVwiOiBcIlNUUklOR1wiIH0sXG4gICAgICAgICAgeyBcIm5hbWVcIjogXCJwYXlsb2FkXCIsIFwidHlwZVwiOiBcIlNUUklOR1wiIH0sXG4gICAgICAgICAgeyBcIm5hbWVcIjogXCJjcmVhdGVkQXRcIiwgXCJ0eXBlXCI6IFwiREFURVRJTUVcIiB9LFxuICAgICAgICAgIHsgXCJuYW1lXCI6IFwidXBkYXRlZEF0XCIsIFwidHlwZVwiOiBcIkRBVEVUSU1FXCIgfSxcbiAgICAgICAgICB7IFwibmFtZVwiOiBcImRlbGV0ZWRBdFwiLCBcInR5cGVcIjogXCJEQVRFVElNRVwiIH0sXG4gICAgICAgICAgeyBcIm5hbWVcIjogXCJzZWFyY2hUZXh0XCIsIFwidHlwZVwiOiBcIlNUUklOR1wiIH1cbiAgICAgICAgXVxuICAgICAgfSxcbiAgICAgIFwic3luY0VuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJuYW1lXCI6IFwiY3VzdG9tX3NjZW5hcmlvX2xhbmVzXCIsXG4gICAgICBcInNjaGVtYVwiOiB7XG4gICAgICAgIFwiY29sdW1uc1wiOiBbXG4gICAgICAgICAgeyBcIm5hbWVcIjogXCJpZFwiLCBcInR5cGVcIjogXCJTVFJJTkdcIiB9LFxuICAgICAgICAgIHsgXCJuYW1lXCI6IFwia2luZFwiLCBcInR5cGVcIjogXCJTVFJJTkdcIiB9LFxuICAgICAgICAgIHsgXCJuYW1lXCI6IFwic2NlbmFyaW9JZFwiLCBcInR5cGVcIjogXCJTVFJJTkdcIiB9LFxuICAgICAgICAgIHsgXCJuYW1lXCI6IFwic2NlbmFyaW9OYW1lXCIsIFwidHlwZVwiOiBcIlNUUklOR1wiIH0sXG4gICAgICAgICAgeyBcIm5hbWVcIjogXCJjaHVua0luZGV4XCIsIFwidHlwZVwiOiBcIkxPTkdcIiB9LFxuICAgICAgICAgIHsgXCJuYW1lXCI6IFwiY2h1bmtDb3VudFwiLCBcInR5cGVcIjogXCJMT05HXCIgfSxcbiAgICAgICAgICB7IFwibmFtZVwiOiBcImxhbmVDb3VudFwiLCBcInR5cGVcIjogXCJMT05HXCIgfSxcbiAgICAgICAgICB7IFwibmFtZVwiOiBcInBheWxvYWRcIiwgXCJ0eXBlXCI6IFwiU1RSSU5HXCIgfSxcbiAgICAgICAgICB7IFwibmFtZVwiOiBcImNyZWF0ZWRBdFwiLCBcInR5cGVcIjogXCJEQVRFVElNRVwiIH0sXG4gICAgICAgICAgeyBcIm5hbWVcIjogXCJ1cGRhdGVkQXRcIiwgXCJ0eXBlXCI6IFwiREFURVRJTUVcIiB9LFxuICAgICAgICAgIHsgXCJuYW1lXCI6IFwiZGVsZXRlZEF0XCIsIFwidHlwZVwiOiBcIkRBVEVUSU1FXCIgfSxcbiAgICAgICAgICB7IFwibmFtZVwiOiBcInNlYXJjaFRleHRcIiwgXCJ0eXBlXCI6IFwiU1RSSU5HXCIgfVxuICAgICAgICBdXG4gICAgICB9LFxuICAgICAgXCJzeW5jRW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcIm5hbWVcIjogXCJub3RpZmljYXRpb25cIixcbiAgICAgIFwic2NoZW1hXCI6IHtcbiAgICAgICAgXCJjb2x1bW5zXCI6IFtcbiAgICAgICAgICB7IFwibmFtZVwiOiBcImlkXCIsIFwidHlwZVwiOiBcIlNUUklOR1wiIH0sXG4gICAgICAgICAgeyBcIm5hbWVcIjogXCJraW5kXCIsIFwidHlwZVwiOiBcIlNUUklOR1wiIH0sXG4gICAgICAgICAgeyBcIm5hbWVcIjogXCJub3RpZmljYXRpb25JZFwiLCBcInR5cGVcIjogXCJTVFJJTkdcIiB9LFxuICAgICAgICAgIHsgXCJuYW1lXCI6IFwicmVjaXBpZW50VXNlcklkXCIsIFwidHlwZVwiOiBcIlNUUklOR1wiIH0sXG4gICAgICAgICAgeyBcIm5hbWVcIjogXCJyZWNpcGllbnRVc2VyRW1haWxcIiwgXCJ0eXBlXCI6IFwiU1RSSU5HXCIgfSxcbiAgICAgICAgICB7IFwibmFtZVwiOiBcInN0YXR1c1wiLCBcInR5cGVcIjogXCJTVFJJTkdcIiB9LFxuICAgICAgICAgIHsgXCJuYW1lXCI6IFwicGF5bG9hZFwiLCBcInR5cGVcIjogXCJTVFJJTkdcIiB9LFxuICAgICAgICAgIHsgXCJuYW1lXCI6IFwiY3JlYXRlZEF0XCIsIFwidHlwZVwiOiBcIkRBVEVUSU1FXCIgfSxcbiAgICAgICAgICB7IFwibmFtZVwiOiBcInVwZGF0ZWRBdFwiLCBcInR5cGVcIjogXCJEQVRFVElNRVwiIH1cbiAgICAgICAgXVxuICAgICAgfSxcbiAgICAgIFwic3luY0VuYWJsZWRcIjogdHJ1ZVxuICAgIH1cbiAgXSxcbiAgXCJwYWNrYWdlc01hcHBpbmdcIjogW1xuICAgIHtcbiAgICAgIFwibmFtZVwiOiBcIkRPTU8gRGF0YUZsb3dzXCIsXG4gICAgICBcImFsaWFzXCI6IFwiZGF0YWZsb3dzdGF0dXNcIixcbiAgICAgIFwicGFja2FnZUlkXCI6IFwiZmQ5NDU0MGEtOGM5NC00ZDhjLWFmMGYtOGIxNDkxMzhhZGQwXCIsXG4gICAgICBcInBhcmFtZXRlcnNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgXCJuYW1lXCI6IFwiZGF0YUZsb3dJZFwiLFxuICAgICAgICAgIFwiZGlzcGxheU5hbWVcIjogXCJkYXRhRmxvd0lkXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxuICAgICAgICAgIFwidmFsdWVcIjogbnVsbCxcbiAgICAgICAgICBcIm51bGxhYmxlXCI6IGZhbHNlLFxuICAgICAgICAgIFwiaXNMaXN0XCI6IGZhbHNlLFxuICAgICAgICAgIFwiY2hpbGRyZW5cIjogW10sXG4gICAgICAgICAgXCJlbnRpdHlTdWJUeXBlXCI6IG51bGwsXG4gICAgICAgICAgXCJhbGlhc1wiOiBcImRhdGFGbG93SWRcIlxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJvdXRwdXRcIjoge1xuICAgICAgICBcIm5hbWVcIjogXCJyZXN1bHRcIixcbiAgICAgICAgXCJkaXNwbGF5TmFtZVwiOiBcInJlc3VsdFwiLFxuICAgICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXG4gICAgICAgIFwidmFsdWVcIjogbnVsbCxcbiAgICAgICAgXCJudWxsYWJsZVwiOiB0cnVlLFxuICAgICAgICBcImlzTGlzdFwiOiBmYWxzZSxcbiAgICAgICAgXCJjaGlsZHJlblwiOiBbXSxcbiAgICAgICAgXCJlbnRpdHlTdWJUeXBlXCI6IG51bGwsXG4gICAgICAgIFwiYWxpYXNcIjogXCJyZXN1bHRcIlxuICAgICAgfSxcbiAgICAgIFwidmVyc2lvblwiOiBcIjIuMC4xM1wiLFxuICAgICAgXCJmdW5jdGlvbk5hbWVcIjogXCJnZXREYXRhZmxvd0V4ZWN1dGlvbnNTdGF0dXNcIlxuICAgIH0sXG4gICAge1xuICAgICAgXCJuYW1lXCI6IFwiRE9NTyBEYXRhRmxvd3NcIixcbiAgICAgIFwiYWxpYXNcIjogXCJkYXRhZmxvd21ldGFkYXRhXCIsXG4gICAgICBcInBhY2thZ2VJZFwiOiBcImZkOTQ1NDBhLThjOTQtNGQ4Yy1hZjBmLThiMTQ5MTM4YWRkMFwiLFxuICAgICAgXCJwYXJhbWV0ZXJzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgIFwibmFtZVwiOiBcImRhdGFGbG93SWRcIixcbiAgICAgICAgICBcImRpc3BsYXlOYW1lXCI6IFwiZGF0YUZsb3dJZFwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInRleHRcIixcbiAgICAgICAgICBcInZhbHVlXCI6IG51bGwsXG4gICAgICAgICAgXCJudWxsYWJsZVwiOiBmYWxzZSxcbiAgICAgICAgICBcImlzTGlzdFwiOiBmYWxzZSxcbiAgICAgICAgICBcImNoaWxkcmVuXCI6IFtdLFxuICAgICAgICAgIFwiZW50aXR5U3ViVHlwZVwiOiBudWxsLFxuICAgICAgICAgIFwiYWxpYXNcIjogXCJkYXRhRmxvd0lkXCJcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIFwib3V0cHV0XCI6IHtcbiAgICAgICAgXCJuYW1lXCI6IFwicmVzdWx0XCIsXG4gICAgICAgIFwiZGlzcGxheU5hbWVcIjogXCJyZXN1bHRcIixcbiAgICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICAgIFwidmFsdWVcIjogbnVsbCxcbiAgICAgICAgXCJudWxsYWJsZVwiOiB0cnVlLFxuICAgICAgICBcImlzTGlzdFwiOiBmYWxzZSxcbiAgICAgICAgXCJjaGlsZHJlblwiOiBbXSxcbiAgICAgICAgXCJlbnRpdHlTdWJUeXBlXCI6IG51bGwsXG4gICAgICAgIFwiYWxpYXNcIjogXCJyZXN1bHRcIlxuICAgICAgfSxcbiAgICAgIFwidmVyc2lvblwiOiBcIjIuMC4xM1wiLFxuICAgICAgXCJmdW5jdGlvbk5hbWVcIjogXCJnZXREYXRhRmxvd01ldGFkYXRhXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIFwibmFtZVwiOiBcIkRPTU8gRGF0YUZsb3dzXCIsXG4gICAgICBcImFsaWFzXCI6IFwic3RhcnRkYXRhZmxvd1wiLFxuICAgICAgXCJwYWNrYWdlSWRcIjogXCJmZDk0NTQwYS04Yzk0LTRkOGMtYWYwZi04YjE0OTEzOGFkZDBcIixcbiAgICAgIFwicGFyYW1ldGVyc1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBcIm5hbWVcIjogXCJkYXRhRmxvd0lkXCIsXG4gICAgICAgICAgXCJkaXNwbGF5TmFtZVwiOiBcImRhdGFGbG93SWRcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXG4gICAgICAgICAgXCJ2YWx1ZVwiOiBudWxsLFxuICAgICAgICAgIFwibnVsbGFibGVcIjogZmFsc2UsXG4gICAgICAgICAgXCJpc0xpc3RcIjogZmFsc2UsXG4gICAgICAgICAgXCJjaGlsZHJlblwiOiBbXSxcbiAgICAgICAgICBcImVudGl0eVN1YlR5cGVcIjogbnVsbCxcbiAgICAgICAgICBcImFsaWFzXCI6IFwiZGF0YUZsb3dJZFwiXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBcIm91dHB1dFwiOiB7XG4gICAgICAgIFwibmFtZVwiOiBcInJlc3VsdFwiLFxuICAgICAgICBcImRpc3BsYXlOYW1lXCI6IFwicmVzdWx0XCIsXG4gICAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgICBcInZhbHVlXCI6IG51bGwsXG4gICAgICAgIFwibnVsbGFibGVcIjogdHJ1ZSxcbiAgICAgICAgXCJpc0xpc3RcIjogZmFsc2UsXG4gICAgICAgIFwiY2hpbGRyZW5cIjogW10sXG4gICAgICAgIFwiZW50aXR5U3ViVHlwZVwiOiBudWxsLFxuICAgICAgICBcImFsaWFzXCI6IFwicmVzdWx0XCJcbiAgICAgIH0sXG4gICAgICBcInZlcnNpb25cIjogXCIyLjAuMTNcIixcbiAgICAgIFwiZnVuY3Rpb25OYW1lXCI6IFwic3RhcnREYXRhRmxvd1wiXG4gICAgfSxcbiAgICB7XG4gICAgICBcIm5hbWVcIjogXCJET01PIERhdGFGbG93c1wiLFxuICAgICAgXCJhbGlhc1wiOiBcImRhdGFmbG93bG9naWNcIixcbiAgICAgIFwicGFja2FnZUlkXCI6IFwiZmQ5NDU0MGEtOGM5NC00ZDhjLWFmMGYtOGIxNDkxMzhhZGQwXCIsXG4gICAgICBcInBhcmFtZXRlcnNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgXCJuYW1lXCI6IFwiZGF0YUZsb3dJZFwiLFxuICAgICAgICAgIFwiZGlzcGxheU5hbWVcIjogXCJkYXRhRmxvd0lkXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxuICAgICAgICAgIFwidmFsdWVcIjogbnVsbCxcbiAgICAgICAgICBcIm51bGxhYmxlXCI6IGZhbHNlLFxuICAgICAgICAgIFwiaXNMaXN0XCI6IGZhbHNlLFxuICAgICAgICAgIFwiY2hpbGRyZW5cIjogW10sXG4gICAgICAgICAgXCJlbnRpdHlTdWJUeXBlXCI6IG51bGwsXG4gICAgICAgICAgXCJhbGlhc1wiOiBcImRhdGFGbG93SWRcIlxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJvdXRwdXRcIjoge1xuICAgICAgICBcIm5hbWVcIjogXCJyZXN1bHRcIixcbiAgICAgICAgXCJkaXNwbGF5TmFtZVwiOiBcInJlc3VsdFwiLFxuICAgICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgICAgXCJ2YWx1ZVwiOiBudWxsLFxuICAgICAgICBcIm51bGxhYmxlXCI6IHRydWUsXG4gICAgICAgIFwiaXNMaXN0XCI6IGZhbHNlLFxuICAgICAgICBcImNoaWxkcmVuXCI6IFtdLFxuICAgICAgICBcImVudGl0eVN1YlR5cGVcIjogbnVsbCxcbiAgICAgICAgXCJhbGlhc1wiOiBcInJlc3VsdFwiXG4gICAgICB9LFxuICAgICAgXCJ2ZXJzaW9uXCI6IFwiMi4wLjEzXCIsXG4gICAgICBcImZ1bmN0aW9uTmFtZVwiOiBcImV4dHJhY3REYXRhZmxvd0xvZ2ljXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIFwibmFtZVwiOiBcIkRPTU8gTm90aWZpY2F0aW9uc1wiLFxuICAgICAgXCJhbGlhc1wiOiBcInNlbmRFbWFpbFwiLFxuICAgICAgXCJwYWNrYWdlSWRcIjogXCIwM2JhNjk3MS05OGQwLTQ2NTQtOWJmZC1hYTg5NzgxNmRmMzNcIixcbiAgICAgIFwicGFyYW1ldGVyc1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBcIm5hbWVcIjogXCJyZWNpcGllbnRFbWFpbHNcIixcbiAgICAgICAgICBcImRpc3BsYXlOYW1lXCI6IFwicmVjaXBpZW50RW1haWxzXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxuICAgICAgICAgIFwidmFsdWVcIjogbnVsbCxcbiAgICAgICAgICBcIm51bGxhYmxlXCI6IHRydWUsXG4gICAgICAgICAgXCJpc0xpc3RcIjogZmFsc2UsXG4gICAgICAgICAgXCJjaGlsZHJlblwiOiBbXSxcbiAgICAgICAgICBcImVudGl0eVN1YlR5cGVcIjogbnVsbCxcbiAgICAgICAgICBcImFsaWFzXCI6IFwicmVjaXBpZW50RW1haWxzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIFwibmFtZVwiOiBcInN1YmplY3RcIixcbiAgICAgICAgICBcImRpc3BsYXlOYW1lXCI6IFwic3ViamVjdFwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInRleHRcIixcbiAgICAgICAgICBcInZhbHVlXCI6IG51bGwsXG4gICAgICAgICAgXCJudWxsYWJsZVwiOiBmYWxzZSxcbiAgICAgICAgICBcImlzTGlzdFwiOiBmYWxzZSxcbiAgICAgICAgICBcImNoaWxkcmVuXCI6IFtdLFxuICAgICAgICAgIFwiZW50aXR5U3ViVHlwZVwiOiBudWxsLFxuICAgICAgICAgIFwiYWxpYXNcIjogXCJzdWJqZWN0XCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIFwibmFtZVwiOiBcImJvZHlcIixcbiAgICAgICAgICBcImRpc3BsYXlOYW1lXCI6IFwiYm9keVwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInRleHRcIixcbiAgICAgICAgICBcInZhbHVlXCI6IG51bGwsXG4gICAgICAgICAgXCJudWxsYWJsZVwiOiB0cnVlLFxuICAgICAgICAgIFwiaXNMaXN0XCI6IGZhbHNlLFxuICAgICAgICAgIFwiY2hpbGRyZW5cIjogW10sXG4gICAgICAgICAgXCJlbnRpdHlTdWJUeXBlXCI6IG51bGwsXG4gICAgICAgICAgXCJhbGlhc1wiOiBcImJvZHlcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgXCJuYW1lXCI6IFwicGVyc29uUmVjaXBpZW50c1wiLFxuICAgICAgICAgIFwiZGlzcGxheU5hbWVcIjogXCJwZXJzb25SZWNpcGllbnRzXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwidXNlclwiLFxuICAgICAgICAgIFwidmFsdWVcIjogbnVsbCxcbiAgICAgICAgICBcIm51bGxhYmxlXCI6IHRydWUsXG4gICAgICAgICAgXCJpc0xpc3RcIjogdHJ1ZSxcbiAgICAgICAgICBcImNoaWxkcmVuXCI6IFtdLFxuICAgICAgICAgIFwiZW50aXR5U3ViVHlwZVwiOiBudWxsLFxuICAgICAgICAgIFwiYWxpYXNcIjogXCJwZXJzb25SZWNpcGllbnRzXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIFwibmFtZVwiOiBcImdyb3VwUmVjaXBpZW50c1wiLFxuICAgICAgICAgIFwiZGlzcGxheU5hbWVcIjogXCJncm91cFJlY2lwaWVudHNcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJncm91cFwiLFxuICAgICAgICAgIFwidmFsdWVcIjogbnVsbCxcbiAgICAgICAgICBcIm51bGxhYmxlXCI6IHRydWUsXG4gICAgICAgICAgXCJpc0xpc3RcIjogdHJ1ZSxcbiAgICAgICAgICBcImNoaWxkcmVuXCI6IFtdLFxuICAgICAgICAgIFwiZW50aXR5U3ViVHlwZVwiOiBudWxsLFxuICAgICAgICAgIFwiYWxpYXNcIjogXCJncm91cFJlY2lwaWVudHNcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgXCJuYW1lXCI6IFwiYXR0YWNobWVudHNcIixcbiAgICAgICAgICBcImRpc3BsYXlOYW1lXCI6IFwiYXR0YWNobWVudHNcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIixcbiAgICAgICAgICBcInZhbHVlXCI6IG51bGwsXG4gICAgICAgICAgXCJudWxsYWJsZVwiOiB0cnVlLFxuICAgICAgICAgIFwiaXNMaXN0XCI6IHRydWUsXG4gICAgICAgICAgXCJjaGlsZHJlblwiOiBbXSxcbiAgICAgICAgICBcImVudGl0eVN1YlR5cGVcIjogbnVsbCxcbiAgICAgICAgICBcImFsaWFzXCI6IFwiYXR0YWNobWVudHNcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgXCJuYW1lXCI6IFwiYXR0YWNobWVudFwiLFxuICAgICAgICAgIFwiZGlzcGxheU5hbWVcIjogXCJhdHRhY2htZW50XCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCIsXG4gICAgICAgICAgXCJ2YWx1ZVwiOiBudWxsLFxuICAgICAgICAgIFwibnVsbGFibGVcIjogdHJ1ZSxcbiAgICAgICAgICBcImlzTGlzdFwiOiBmYWxzZSxcbiAgICAgICAgICBcImNoaWxkcmVuXCI6IFtdLFxuICAgICAgICAgIFwiZW50aXR5U3ViVHlwZVwiOiBudWxsLFxuICAgICAgICAgIFwiYWxpYXNcIjogXCJhdHRhY2htZW50XCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIFwibmFtZVwiOiBcImluY2x1ZGVSZXBseUFsbFwiLFxuICAgICAgICAgIFwiZGlzcGxheU5hbWVcIjogXCJpbmNsdWRlUmVwbHlBbGxcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCIsXG4gICAgICAgICAgXCJ2YWx1ZVwiOiBudWxsLFxuICAgICAgICAgIFwibnVsbGFibGVcIjogdHJ1ZSxcbiAgICAgICAgICBcImlzTGlzdFwiOiBmYWxzZSxcbiAgICAgICAgICBcImNoaWxkcmVuXCI6IFtdLFxuICAgICAgICAgIFwiZW50aXR5U3ViVHlwZVwiOiBudWxsLFxuICAgICAgICAgIFwiYWxpYXNcIjogXCJpbmNsdWRlUmVwbHlBbGxcIlxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgXCJvdXRwdXRcIjoge1xuICAgICAgICBcIm5hbWVcIjogXCJyZXN1bHRcIixcbiAgICAgICAgXCJkaXNwbGF5TmFtZVwiOiBcInJlc3VsdFwiLFxuICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCIsXG4gICAgICAgIFwidmFsdWVcIjogbnVsbCxcbiAgICAgICAgXCJudWxsYWJsZVwiOiB0cnVlLFxuICAgICAgICBcImlzTGlzdFwiOiBmYWxzZSxcbiAgICAgICAgXCJjaGlsZHJlblwiOiBbXSxcbiAgICAgICAgXCJlbnRpdHlTdWJUeXBlXCI6IG51bGwsXG4gICAgICAgIFwiYWxpYXNcIjogXCJyZXN1bHRcIlxuICAgICAgfSxcbiAgICAgIFwidmVyc2lvblwiOiBcIjIuMS4xM1wiLFxuICAgICAgXCJmdW5jdGlvbk5hbWVcIjogXCJzZW5kRW1haWxcIlxuICAgIH1cbiAgXSxcbiAgXCJ3b3JrZmxvd01hcHBpbmdcIjogW1xuICAgIHtcbiAgICAgIFwiYWxpYXNcIjogXCJ0ZXN0RW1haWxcIixcbiAgICAgIFwidmVyc2lvblwiOiBcIjEuMC4xXCIsXG4gICAgICBcInBhcmFtZXRlcnNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgXCJuYW1lXCI6IFwicmVjaXBpZW50RW1haWxzXCIsXG4gICAgICAgICAgXCJhbGlhc2VkTmFtZVwiOiBcInJlY2lwaWVudEVtYWlsc1wiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInRleHRcIixcbiAgICAgICAgICBcImxpc3RcIjogZmFsc2UsXG4gICAgICAgICAgXCJjaGlsZHJlblwiOiBbXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgXCJuYW1lXCI6IFwic3ViamVjdFwiLFxuICAgICAgICAgIFwiYWxpYXNlZE5hbWVcIjogXCJzdWJqZWN0XCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxuICAgICAgICAgIFwibGlzdFwiOiBmYWxzZSxcbiAgICAgICAgICBcImNoaWxkcmVuXCI6IFtdXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBcIm5hbWVcIjogXCJib2R5XCIsXG4gICAgICAgICAgXCJhbGlhc2VkTmFtZVwiOiBcImJvZHlcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXG4gICAgICAgICAgXCJsaXN0XCI6IGZhbHNlLFxuICAgICAgICAgIFwiY2hpbGRyZW5cIjogW11cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIFwibmFtZVwiOiBcInNjZW5hcmlvSWRcIixcbiAgICAgICAgICBcImFsaWFzZWROYW1lXCI6IFwic2NlbmFyaW9JZFwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInRleHRcIixcbiAgICAgICAgICBcImxpc3RcIjogZmFsc2UsXG4gICAgICAgICAgXCJjaGlsZHJlblwiOiBbXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgXCJuYW1lXCI6IFwiZGF0YWZsb3dJZFwiLFxuICAgICAgICAgIFwiYWxpYXNlZE5hbWVcIjogXCJkYXRhZmxvd0lkXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxuICAgICAgICAgIFwibGlzdFwiOiBmYWxzZSxcbiAgICAgICAgICBcImNoaWxkcmVuXCI6IFtdXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBcIm5hbWVcIjogXCJleGVjdXRpb25JZFwiLFxuICAgICAgICAgIFwiYWxpYXNlZE5hbWVcIjogXCJleGVjdXRpb25JZFwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInRleHRcIixcbiAgICAgICAgICBcImxpc3RcIjogZmFsc2UsXG4gICAgICAgICAgXCJjaGlsZHJlblwiOiBbXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgXCJuYW1lXCI6IFwidHJpZ2dlcmVkQnlVc2VySWRcIixcbiAgICAgICAgICBcImFsaWFzZWROYW1lXCI6IFwidHJpZ2dlcmVkQnlVc2VySWRcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXG4gICAgICAgICAgXCJsaXN0XCI6IGZhbHNlLFxuICAgICAgICAgIFwiY2hpbGRyZW5cIjogW11cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIFwibmFtZVwiOiBcInRyaWdnZXJlZEJ5RGlzcGxheU5hbWVcIixcbiAgICAgICAgICBcImFsaWFzZWROYW1lXCI6IFwidHJpZ2dlcmVkQnlEaXNwbGF5TmFtZVwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInRleHRcIixcbiAgICAgICAgICBcImxpc3RcIjogZmFsc2UsXG4gICAgICAgICAgXCJjaGlsZHJlblwiOiBbXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgXCJuYW1lXCI6IFwiY29tcGxldGVkQXRcIixcbiAgICAgICAgICBcImFsaWFzZWROYW1lXCI6IFwiY29tcGxldGVkQXRcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXG4gICAgICAgICAgXCJsaXN0XCI6IGZhbHNlLFxuICAgICAgICAgIFwiY2hpbGRyZW5cIjogW11cbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0sXG4gICAge1xuICAgICAgXCJhbGlhc1wiOiBcInNlbmRFbWFpbFwiLFxuICAgICAgXCJwYXJhbWV0ZXJzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgIFwibmFtZVwiOiBcInJlY2lwaWVudEVtYWlsc1wiLFxuICAgICAgICAgIFwiYWxpYXNlZE5hbWVcIjogXCJyZWNpcGllbnRFbWFpbHNcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXG4gICAgICAgICAgXCJsaXN0XCI6IGZhbHNlLFxuICAgICAgICAgIFwiY2hpbGRyZW5cIjogW11cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIFwibmFtZVwiOiBcInN1YmplY3RcIixcbiAgICAgICAgICBcImFsaWFzZWROYW1lXCI6IFwic3ViamVjdFwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInRleHRcIixcbiAgICAgICAgICBcImxpc3RcIjogZmFsc2UsXG4gICAgICAgICAgXCJjaGlsZHJlblwiOiBbXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgXCJuYW1lXCI6IFwiYm9keVwiLFxuICAgICAgICAgIFwiYWxpYXNlZE5hbWVcIjogXCJib2R5XCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxuICAgICAgICAgIFwibGlzdFwiOiBmYWxzZSxcbiAgICAgICAgICBcImNoaWxkcmVuXCI6IFtdXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBcIm5hbWVcIjogXCJzY2VuYXJpb0lkXCIsXG4gICAgICAgICAgXCJhbGlhc2VkTmFtZVwiOiBcInNjZW5hcmlvSWRcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXG4gICAgICAgICAgXCJsaXN0XCI6IGZhbHNlLFxuICAgICAgICAgIFwiY2hpbGRyZW5cIjogW11cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIFwibmFtZVwiOiBcImRhdGFmbG93SWRcIixcbiAgICAgICAgICBcImFsaWFzZWROYW1lXCI6IFwiZGF0YWZsb3dJZFwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInRleHRcIixcbiAgICAgICAgICBcImxpc3RcIjogZmFsc2UsXG4gICAgICAgICAgXCJjaGlsZHJlblwiOiBbXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgXCJuYW1lXCI6IFwiZXhlY3V0aW9uSWRcIixcbiAgICAgICAgICBcImFsaWFzZWROYW1lXCI6IFwiZXhlY3V0aW9uSWRcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXG4gICAgICAgICAgXCJsaXN0XCI6IGZhbHNlLFxuICAgICAgICAgIFwiY2hpbGRyZW5cIjogW11cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIFwibmFtZVwiOiBcInRyaWdnZXJlZEJ5VXNlcklkXCIsXG4gICAgICAgICAgXCJhbGlhc2VkTmFtZVwiOiBcInRyaWdnZXJlZEJ5VXNlcklkXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxuICAgICAgICAgIFwibGlzdFwiOiBmYWxzZSxcbiAgICAgICAgICBcImNoaWxkcmVuXCI6IFtdXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBcIm5hbWVcIjogXCJ0cmlnZ2VyZWRCeURpc3BsYXlOYW1lXCIsXG4gICAgICAgICAgXCJhbGlhc2VkTmFtZVwiOiBcInRyaWdnZXJlZEJ5RGlzcGxheU5hbWVcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXG4gICAgICAgICAgXCJsaXN0XCI6IGZhbHNlLFxuICAgICAgICAgIFwiY2hpbGRyZW5cIjogW11cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIFwibmFtZVwiOiBcImNvbXBsZXRlZEF0XCIsXG4gICAgICAgICAgXCJhbGlhc2VkTmFtZVwiOiBcImNvbXBsZXRlZEF0XCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxuICAgICAgICAgIFwibGlzdFwiOiBmYWxzZSxcbiAgICAgICAgICBcImNoaWxkcmVuXCI6IFtdXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9XG4gIF0sXG4gIFwicHJveHlcIjogW1xuICAgIHtcbiAgICAgIFwibWV0aG9kXCI6IFwiUE9TVFwiLFxuICAgICAgXCJyb3V0ZVwiOiBcIi9kYXRhcHJvY2Vzc2luZ1wiLFxuICAgICAgXCJ0YXJnZXRcIjogXCJodHRwczovL2Jpc3NlbGwuZG9tby5jb20vYXBpL2RhdGFwcm9jZXNzaW5nL3YxXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIFwibWV0aG9kXCI6IFwiR0VUXCIsXG4gICAgICBcInJvdXRlXCI6IFwiL2RhdGFwcm9jZXNzaW5nXCIsXG4gICAgICBcInRhcmdldFwiOiBcImh0dHBzOi8vYmlzc2VsbC5kb21vLmNvbS9hcGkvZGF0YXByb2Nlc3NpbmcvdjFcIlxuICAgIH1cbiAgXSxcbiAgXCJpZFwiOiBcIjZhNDc1ZjA4LTZmYTUtNGU3ZC1iNjkxLWRhYzY3YzZiZjE3YVwiXG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkQ6XFxcXERvd25sb2Fkc1xcXFxzYjEtdHBwZ3NtMnpcXFxcc3JjXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxEb3dubG9hZHNcXFxcc2IxLXRwcGdzbTJ6XFxcXHNyY1xcXFxzZXR1cFByb3h5LmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9Eb3dubG9hZHMvc2IxLXRwcGdzbTJ6L3NyYy9zZXR1cFByb3h5LmpzXCI7aW1wb3J0IHsgUHJveHkgfSBmcm9tICdAZG9tb2luYy9yeXV1LXByb3h5JztcblxuLy8gSW1wb3J0IG1hbmlmZXN0IGR5bmFtaWNhbGx5XG5sZXQgbWFuaWZlc3Q7XG50cnkge1xuICBjb25zdCBtYW5pZmVzdE1vZHVsZSA9IGF3YWl0IGltcG9ydCgnLi4vcHVibGljL21hbmlmZXN0Lmpzb24nLCB7XG4gICAgYXNzZXJ0OiB7IHR5cGU6ICdqc29uJyB9XG4gIH0pO1xuICBtYW5pZmVzdCA9IG1hbmlmZXN0TW9kdWxlLmRlZmF1bHQ7XG59IGNhdGNoIChlcnIpIHtcbiAgY29uc29sZS53YXJuKCdDb3VsZCBub3QgbG9hZCBtYW5pZmVzdC5qc29uJyk7XG4gIG1hbmlmZXN0ID0geyBuYW1lOiAnQklTU0VMTCBOZXR3b3JrIE9wdGltaXphdGlvbiBVSScsIHZlcnNpb246ICcxLjAuMCcgfTtcbn1cblxuY29uc3QgY29uZmlnID0geyBtYW5pZmVzdCB9O1xuY29uc3Qgcnl1dVByb3h5ID0gbmV3IFByb3h5KGNvbmZpZyk7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChhcHApIHtcbiAgYXBwLnVzZShyeXV1UHJveHkuZXhwcmVzcygpKTtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiRDpcXFxcRG93bmxvYWRzXFxcXHNiMS10cHBnc20yelwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcRG93bmxvYWRzXFxcXHNiMS10cHBnc20yelxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovRG93bmxvYWRzL3NiMS10cHBnc20yei92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcbmltcG9ydCB7IGNvcHlGaWxlU3luYywgZXhpc3RzU3luYywgbWtkaXJTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCwgVVJMIH0gZnJvbSAndXJsJztcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIGJhc2U6ICcuLycsXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJ0AnOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoJy4vc3JjJywgaW1wb3J0Lm1ldGEudXJsKSksXG4gICAgfSxcbiAgfSxcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAge1xuICAgICAgbmFtZTogJ2NvbmZpZ3VyZS1zZXJ2ZXInLFxuICAgICAgYXN5bmMgY29uZmlndXJlU2VydmVyKHNlcnZlcikge1xuICAgICAgICAvLyBEeW5hbWljYWxseSBpbXBvcnQgc2V0dXBQcm94eVxuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHsgZGVmYXVsdDogc2V0dXBQcm94eSB9ID0gYXdhaXQgaW1wb3J0KCcuL3NyYy9zZXR1cFByb3h5LmpzJyk7XG4gICAgICAgICAgc2V0dXBQcm94eShzZXJ2ZXIubWlkZGxld2FyZXMpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oJ3NldHVwUHJveHkgbm90IGZvdW5kLCBza2lwcGluZycpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICBuYW1lOiAnY29weS1tYW5pZmVzdCcsXG4gICAgICBjbG9zZUJ1bmRsZSgpIHtcbiAgICAgICAgaWYgKCFleGlzdHNTeW5jKCcuL2Rpc3QnKSkge1xuICAgICAgICAgIG1rZGlyU3luYygnLi9kaXN0JywgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvcHlGaWxlU3luYygnLi9wdWJsaWMvbWFuaWZlc3QuanNvbicsICcuL2Rpc3QvbWFuaWZlc3QuanNvbicpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdcdTI3MTMgQ29waWVkIG1hbmlmZXN0Lmpzb24gdG8gZGlzdCcpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gY29weSBtYW5pZmVzdC5qc29uOicsIGVycik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIF0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGV4Y2x1ZGU6IFsnbHVjaWRlLXJlYWN0J10sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQSxNQUNFLE1BQVE7QUFBQSxNQUNSLFNBQVc7QUFBQSxNQUNYLE1BQVE7QUFBQSxRQUNOLE9BQVM7QUFBQSxRQUNULFFBQVU7QUFBQSxNQUNaO0FBQUEsTUFDQSxVQUFZO0FBQUEsTUFDWixhQUFlO0FBQUEsTUFDZixpQkFBbUIsQ0FBQztBQUFBLE1BQ3BCLG9CQUFzQjtBQUFBLFFBQ3BCO0FBQUEsVUFDRSxNQUFRO0FBQUEsVUFDUixRQUFVO0FBQUEsWUFDUixTQUFXO0FBQUEsY0FDVCxFQUFFLE1BQVEsTUFBTSxNQUFRLFNBQVM7QUFBQSxjQUNqQyxFQUFFLE1BQVEsUUFBUSxNQUFRLFNBQVM7QUFBQSxjQUNuQyxFQUFFLE1BQVEsZ0JBQWdCLE1BQVEsU0FBUztBQUFBLGNBQzNDLEVBQUUsTUFBUSxrQkFBa0IsTUFBUSxTQUFTO0FBQUEsY0FDN0MsRUFBRSxNQUFRLGVBQWUsTUFBUSxTQUFTO0FBQUEsY0FDMUMsRUFBRSxNQUFRLGlCQUFpQixNQUFRLFNBQVM7QUFBQSxjQUM1QyxFQUFFLE1BQVEsa0JBQWtCLE1BQVEsU0FBUztBQUFBLGNBQzdDLEVBQUUsTUFBUSxVQUFVLE1BQVEsU0FB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TUFBUTtBQUFBLGNBQ1IsYUFBZTtBQUFBLGNBQ2YsTUFBUTtBQUFBLGNBQ1IsTUFBUTtBQUFBLGNBQ1IsVUFBWSxDQUFDO0FBQUEsWUFDZjtBQUFBLFlBQ0E7QUFBQSxjQUNFLE1BQVE7QUFBQSxjQUNSLGFBQWU7QUFBQSxjQUNmLE1BQVE7QUFBQSxjQUNSLE1BQVE7QUFBQSxjQUNSLFVBQVksQ0FBQztBQUFBLFlBQ2Y7QUFBQSxZQUNBO0FBQUEsY0FDRSxNQUFRO0FBQUEsY0FDUixhQUFlO0FBQUEsY0FDZixNQUFRO0FBQUEsY0FDUixNQUFRO0FBQUEsY0FDUixVQUFZLENBQUM7QUFBQSxZQUNmO0FBQUEsWUFDQTtBQUFBLGNBQ0UsTUFBUTtBQUFBLGNBQ1IsYUFBZTtBQUFBLGNBQ2YsTUFBUTtBQUFBLGNBQ1IsTUFBUTtBQUFBLGNBQ1IsVUFBWSxDQUFDO0FBQUEsWUFDZjtBQUFBLFlBQ0E7QUFBQSxjQUNFLE1BQVE7QUFBQSxjQUNSLGFBQWU7QUFBQSxjQUNmLE1BQVE7QUFBQSxjQUNSLE1BQVE7QUFBQSxjQUNSLFVBQVksQ0FBQztBQUFBLFlBQ2Y7QUFBQSxZQUNBO0FBQUEsY0FDRSxNQUFRO0FBQUEsY0FDUixhQUFlO0FBQUEsY0FDZixNQUFRO0FBQUEsY0FDUixNQUFRO0FBQUEsY0FDUixVQUFZLENBQUM7QUFBQSxZQUNmO0FBQUEsWUFDQTtBQUFBLGNBQ0UsTUFBUTtBQUFBLGNBQ1IsYUFBZTtBQUFBLGNBQ2YsTUFBUTtBQUFBLGNBQ1IsTUFBUTtBQUFBLGNBQ1IsVUFBWSxDQUFDO0FBQUEsWUFDZjtBQUFBLFlBQ0E7QUFBQSxjQUNFLE1BQVE7QUFBQSxjQUNSLGFBQWU7QUFBQSxjQUNmLE1BQVE7QUFBQSxjQUNSLE1BQVE7QUFBQSxjQUNSLFVBQVksQ0FBQztBQUFBLFlBQ2Y7QUFBQSxZQUNBO0FBQUEsY0FDRSxNQUFRO0FBQUEsY0FDUixhQUFlO0FBQUEsY0FDZixNQUFRO0FBQUEsY0FDUixNQUFRO0FBQUEsY0FDUixVQUFZLENBQUM7QUFBQSxZQUNmO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFBQSxRQUNBO0FBQUEsVUFDRSxPQUFTO0FBQUEsVUFDVCxZQUFjO0FBQUEsWUFDWjtBQUFBLGNBQ0UsTUFBUTtBQUFBLGNBQ1IsYUFBZTtBQUFBLGNBQ2YsTUFBUTtBQUFBLGNBQ1IsTUFBUTtBQUFBLGNBQ1IsVUFBWSxDQUFDO0FBQUEsWUFDZjtBQUFBLFlBQ0E7QUFBQSxjQUNFLE1BQVE7QUFBQSxjQUNSLGFBQWU7QUFBQSxjQUNmLE1BQVE7QUFBQSxjQUNSLE1BQVE7QUFBQSxjQUNSLFVBQVksQ0FBQztBQUFBLFlBQ2Y7QUFBQSxZQUNBO0FBQUEsY0FDRSxNQUFRO0FBQUEsY0FDUixhQUFlO0FBQUEsY0FDZixNQUFRO0FBQUEsY0FDUixNQUFRO0FBQUEsY0FDUixVQUFZLENBQUM7QUFBQSxZQUNmO0FBQUEsWUFDQTtBQUFBLGNBQ0UsTUFBUTtBQUFBLGNBQ1IsYUFBZTtBQUFBLGNBQ2YsTUFBUTtBQUFBLGNBQ1IsTUFBUTtBQUFBLGNBQ1IsVUFBWSxDQUFDO0FBQUEsWUFDZjtBQUFBLFlBQ0E7QUFBQSxjQUNFLE1BQVE7QUFBQSxjQUNSLGFBQWU7QUFBQSxjQUNmLE1BQVE7QUFBQSxjQUNSLE1BQVE7QUFBQSxjQUNSLFVBQVksQ0FBQztBQUFBLFlBQ2Y7QUFBQSxZQUNBO0FBQUEsY0FDRSxNQUFRO0FBQUEsY0FDUixhQUFlO0FBQUEsY0FDZixNQUFRO0FBQUEsY0FDUixNQUFRO0FBQUEsY0FDUixVQUFZLENBQUM7QUFBQSxZQUNmO0FBQUEsWUFDQTtBQUFBLGNBQ0UsTUFBUTtBQUFBLGNBQ1IsYUFBZTtBQUFBLGNBQ2YsTUFBUTtBQUFBLGNBQ1IsTUFBUTtBQUFBLGNBQ1IsVUFBWSxDQUFDO0FBQUEsWUFDZjtBQUFBLFlBQ0E7QUFBQSxjQUNFLE1BQVE7QUFBQSxjQUNSLGFBQWU7QUFBQSxjQUNmLE1BQVE7QUFBQSxjQUNSLE1BQVE7QUFBQSxjQUNSLFVBQVksQ0FBQztBQUFBLFlBQ2Y7QUFBQSxZQUNBO0FBQUEsY0FDRSxNQUFRO0FBQUEsY0FDUixhQUFlO0FBQUEsY0FDZixNQUFRO0FBQUEsY0FDUixNQUFRO0FBQUEsY0FDUixVQUFZLENBQUM7QUFBQSxZQUNmO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsTUFDQSxPQUFTO0FBQUEsUUFDUDtBQUFBLFVBQ0UsUUFBVTtBQUFBLFVBQ1YsT0FBUztBQUFBLFVBQ1QsUUFBVTtBQUFBLFFBQ1o7QUFBQSxRQUNBO0FBQUEsVUFDRSxRQUFVO0FBQUEsVUFDVixPQUFTO0FBQUEsVUFDVCxRQUFVO0FBQUEsUUFDWjtBQUFBLE1BQ0Y7QUFBQSxNQUNBLElBQU07QUFBQSxJQUNSO0FBQUE7QUFBQTs7O0FDaGVBO0FBQUE7QUFBQTtBQUFBO0FBQStRLFNBQVMsU0FBQUEsY0FBYTtBQWlCdFIsU0FBUixtQkFBa0IsS0FBSztBQUM1QixNQUFJLElBQUksVUFBVSxRQUFRLENBQUM7QUFDN0I7QUFuQkEsSUFHSSxVQVdFLFFBQ0E7QUFmTjtBQUFBO0FBSUEsUUFBSTtBQUNGLFlBQU0saUJBQWlCLE1BQU07QUFHN0IsaUJBQVcsZUFBZTtBQUFBLElBQzVCLFNBQVMsS0FBSztBQUNaLGNBQVEsS0FBSyw4QkFBOEI7QUFDM0MsaUJBQVcsRUFBRSxNQUFNLG1DQUFtQyxTQUFTLFFBQVE7QUFBQSxJQUN6RTtBQUVBLElBQU0sU0FBUyxFQUFFLFNBQVM7QUFDMUIsSUFBTSxZQUFZLElBQUlBLE9BQU0sTUFBTTtBQUFBO0FBQUE7OztBQ2ZpTyxTQUFTLG9CQUFvQjtBQUNoUyxPQUFPLFdBQVc7QUFDbEIsU0FBUyxjQUFjLFlBQVksaUJBQWlCO0FBQ3BELFNBQVMsZUFBZSxXQUFXO0FBSDRILElBQU0sMkNBQTJDO0FBTWhOLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLE1BQU07QUFBQSxFQUNOLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssY0FBYyxJQUFJLElBQUksU0FBUyx3Q0FBZSxDQUFDO0FBQUEsSUFDdEQ7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTjtBQUFBLE1BQ0UsTUFBTTtBQUFBLE1BQ04sTUFBTSxnQkFBZ0IsUUFBUTtBQUU1QixZQUFJO0FBQ0YsZ0JBQU0sRUFBRSxTQUFTLFdBQVcsSUFBSSxNQUFNO0FBQ3RDLHFCQUFXLE9BQU8sV0FBVztBQUFBLFFBQy9CLFNBQVMsS0FBSztBQUNaLGtCQUFRLEtBQUssZ0NBQWdDO0FBQUEsUUFDL0M7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0E7QUFBQSxNQUNFLE1BQU07QUFBQSxNQUNOLGNBQWM7QUFDWixZQUFJLENBQUMsV0FBVyxRQUFRLEdBQUc7QUFDekIsb0JBQVUsVUFBVSxFQUFFLFdBQVcsS0FBSyxDQUFDO0FBQUEsUUFDekM7QUFFQSxZQUFJO0FBQ0YsdUJBQWEsMEJBQTBCLHNCQUFzQjtBQUM3RCxrQkFBUSxJQUFJLHFDQUFnQztBQUFBLFFBQzlDLFNBQVMsS0FBSztBQUNaLGtCQUFRLE1BQU0saUNBQWlDLEdBQUc7QUFBQSxRQUNwRDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLGNBQWM7QUFBQSxFQUMxQjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbIlByb3h5Il0KfQo=
