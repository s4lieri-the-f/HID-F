import type { DuckyScript } from "../types/nodes.js";

export function saveProjectAsJson(script: DuckyScript, settings?: { defaultDelay: number; duckyVersion: number }): void {
  const projectData = {
    ...script,
    settings: settings || { defaultDelay: 10, duckyVersion: 3 }
  };
  const jsonString = JSON.stringify(projectData, null, 2);
  const filename = script.metadata.filename || script.metadata.name;
  downloadFile(jsonString, `${filename}.json`, "application/json");
}

export function saveScriptAsTxt(
  script: DuckyScript,
  compiledContent: string,
): void {
  const filename = script.metadata.filename || script.metadata.name;
  downloadFile(compiledContent, `${filename}.txt`, "text/plain");
}

export function loadProjectFromJson(file: File): Promise<{ script: DuckyScript; settings?: { defaultDelay: number; duckyVersion: number } }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        // Handle both old format (just DuckyScript) and new format (with settings)
        let script: DuckyScript;
        let settings: { defaultDelay: number; duckyVersion: number } | undefined;

        if (data.nodes && data.connections && data.metadata) {
          // New format with settings
          script = data as DuckyScript;
          settings = data.settings;
        } else if (data.script) {
          // Alternative new format
          script = data.script;
          settings = data.settings;
        } else {
          // Old format - just the script
          script = data as DuckyScript;
        }

        if (!script.nodes || !script.connections || !script.metadata) {
          throw new Error("Invalid project file format");
        }

        if (!script.metadata.filename) {
          script.metadata.filename =
            script.metadata.name
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, "")
              .replace(/\s+/g, "_")
              .substring(0, 50) || "script";
        }

        resolve({ script, settings });
      } catch (error) {
        reject(
          new Error(
            "Failed to parse project file: " + (error as Error).message,
          ),
        );
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

function downloadFile(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export function createEmptyScript(name: string = "New Script"): DuckyScript {
  const now = new Date().toISOString();
  const filename =
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 50) || "new_script";

  return {
    nodes: [],
    connections: [],
    metadata: {
      name,
      filename,
      description: "",
      created: now,
      modified: now,
    },
  };
}

export function generateNodeId(): string {
  return "node_" + Math.random().toString(36).substr(2, 9);
}

export function generateConnectionId(): string {
  return "conn_" + Math.random().toString(36).substr(2, 9);
}
