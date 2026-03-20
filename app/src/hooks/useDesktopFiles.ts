import { useState, useCallback } from "react";

interface DesktopFile {
  name: string;
  is_dir: boolean;
  size: number;
}

export function useDesktopFiles() {
  const [files, setFiles] = useState<DesktopFile[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.deskerAPI.fs.listDesktopFiles();
      setFiles(result);
    } catch (err) {
      console.error("Failed to list desktop files:", err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { files, loading, loadFiles };
}
