import { app, BrowserWindow, ipcMain, Menu, shell } from "electron";
import path from "path";
import { initDatabase } from "./services/db.service";
import { registerDbHandlers } from "./ipc/db.ipc";
import { registerPtyHandlers } from "./ipc/pty.ipc";
import { registerFsHandlers } from "./ipc/fs.ipc";
import { registerAiHandlers } from "./ipc/ai.ipc";
import { registerDotArtHandlers } from "./ipc/dotart.ipc";
import { registerMcpHandlers } from "./ipc/mcp.ipc";
import { registerOAuthHandlers } from "./ipc/oauth.ipc";
import { registerAiChatHandlers } from "./ipc/ai-chat.ipc";
import { registerOrchestrationHandlers } from "./ipc/orchestration.ipc";
import { startOrchestrationBridge, stopOrchestrationBridge } from "./services/orchestration-bridge.service";

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const isMac = process.platform === "darwin";
  const isWin = process.platform === "win32";

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: isMac ? "hidden" : "default",
    ...(isMac ? { trafficLightPosition: { x: 14, y: 13 } } : {}),
    ...(isWin ? { frame: false } : {}),
    backgroundColor: "#0f0f13",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.on("blur", () => {
    mainWindow?.webContents.send("window:blur");
  });
  mainWindow.on("focus", () => {
    mainWindow?.webContents.send("window:focus");
  });
}

app.whenReady().then(() => {
  // Enable Cmd+C/V/X/A in frameless window
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "Edit",
        submenu: [
          { role: "undo" },
          { role: "redo" },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          { role: "selectAll" },
        ],
      },
    ])
  );

  initDatabase();
  startOrchestrationBridge().catch((err) => console.error("[Orchestration Bridge] failed to start:", err));

  const getWindow = () => mainWindow;
  registerDbHandlers(ipcMain);
  registerPtyHandlers(ipcMain, getWindow);
  registerFsHandlers(ipcMain);
  registerAiHandlers(ipcMain, getWindow);
  registerDotArtHandlers(ipcMain);
  registerMcpHandlers(ipcMain);
  registerOAuthHandlers(ipcMain);
  registerAiChatHandlers(ipcMain, getWindow);
  registerOrchestrationHandlers(getWindow);

  // Window control handlers
  ipcMain.handle("window:minimize", () => mainWindow?.minimize());
  ipcMain.handle("window:maximize", () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle("window:close", () => mainWindow?.close());
  ipcMain.handle("window:openExternal", (_, url: string) => shell.openExternal(url));
  ipcMain.handle("window:setAutoLaunch", (_, enabled: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enabled });
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  stopOrchestrationBridge();
  app.quit();
});
