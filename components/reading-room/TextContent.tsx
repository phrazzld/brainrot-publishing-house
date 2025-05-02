'use client';

interface TextContentProps {
  isLoading: boolean;
  content: string;
}

export default function TextContent({ isLoading, content }: TextContentProps) {
  const lines = content.split('\n').map((line, i) => (
    <div key={i} className="my-1">
      {line.trim() ? line : <>&nbsp;</>}
    </div>
  ));

  return (
    <main className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto">
      {isLoading ? (
        <div className="text-center text-lavender animate-pulse">loading text, hold up...</div>
      ) : (
        lines
      )}
    </main>
  );
}
