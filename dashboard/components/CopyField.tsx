"use client";

import { useState } from "react";
import { clsx } from "clsx";

interface CopyFieldProps {
  label: string;
  value: string;
  mono?: boolean;
}

export function CopyField({ label, value, mono = false }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">{label}</label>
      <div className="flex items-center gap-2">
        <div
          className={clsx(
            "flex-1 rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm",
            "overflow-x-auto",
            mono && "font-mono"
          )}
        >
          <code className="text-gray-100">{value}</code>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={clsx(
            "px-4 py-2 text-sm font-medium rounded-md border transition-colors",
            copied
              ? "bg-green-50 text-green-700 border-green-300"
              : "bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-900"
          )}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
