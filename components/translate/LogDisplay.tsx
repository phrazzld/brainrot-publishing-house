'use client';

interface LogDisplayProps {
  logs: string[];
  error: string;
}

export default function LogDisplay({ logs, error }: LogDisplayProps) {
  return (
    <>
      {error && <div className="text-red-400">error: {error}</div>}

      <div className="mt-4 bg-black/20 p-2 rounded-md max-w-2xl">
        <h2 className="text-lg font-semibold mb-2">logs</h2>
        <div className="text-sm">
          {logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </div>
    </>
  );
}
