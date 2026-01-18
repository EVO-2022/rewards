"use client";

import { AdminEventLogItem } from "@/lib/types";

interface EventsTableProps {
  events: AdminEventLogItem[];
}

export function EventsTable({ events }: EventsTableProps) {
  const formatMetadata = (metadata: Record<string, any> | null): string => {
    if (!metadata || Object.keys(metadata).length === 0) {
      return "—";
    }
    try {
      return JSON.stringify(metadata, null, 2);
    } catch {
      return String(metadata);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="bg-gray-900">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Event
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created At
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Metadata
            </th>
          </tr>
        </thead>
        <tbody className="bg-gray-800 divide-y divide-gray-700">
          {events.map((event) => (
            <tr key={event.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
                {event.eventName}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-100">
                {event.externalUserId || "—"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(event.createdAt).toLocaleString()}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                <pre className="max-h-32 overflow-auto text-xs font-mono bg-gray-900 p-2 rounded border border-gray-700">
                  {formatMetadata(event.metadata)}
                </pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
