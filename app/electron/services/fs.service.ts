import fs from "fs";
import path from "path";
import os from "os";
import { shell } from "electron";

export interface DesktopFile {
  name: string;
  is_dir: boolean;
  size: number;
}

export function listDesktopFiles(): DesktopFile[] {
  const desktopPath = path.join(os.homedir(), "Desktop");
  if (!fs.existsSync(desktopPath)) return [];

  return fs
    .readdirSync(desktopPath)
    .filter((name) => !name.startsWith("."))
    .map((name) => {
      try {
        const stat = fs.statSync(path.join(desktopPath, name));
        return { name, is_dir: stat.isDirectory(), size: stat.size };
      } catch {
        return { name, is_dir: false, size: 0 };
      }
    })
    .sort(
      (a, b) =>
        (b.is_dir ? 1 : 0) - (a.is_dir ? 1 : 0) || a.name.localeCompare(b.name)
    );
}

export function openDesktopFile(name: string): void {
  const filePath = path.join(os.homedir(), "Desktop", name);
  shell.openPath(filePath);
}
