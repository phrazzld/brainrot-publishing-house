import { useState } from "react";

type DownloadButtonProps = {
  slug: string;
  type: "full" | "chapter";
  chapter?: number;
  classNames?: string;
};

export default function DownloadButton({ slug, type, chapter, classNames }: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");

  async function handleDownload() {
    setIsDownloading(true);
    setError("");

    try {
      // grab the signed url
      const chapterParam = chapter ? `&chapter=${chapter}` : "";
      const res = await fetch(`/api/download?slug=${slug}&type=${type}${chapterParam}`);
      if (!res.ok) throw new Error("could not fetch signed url");
      const { url: signedUrl } = await res.json();
      if (!signedUrl) throw new Error("no signed url provided");

      // fetch the actual audio file as a blob
      const fileRes = await fetch(signedUrl);
      if (!fileRes.ok) throw new Error("failed to fetch audio file");
      const blob = await fileRes.blob();

      // create a local url for that blob
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download =
        type === "full" ? `${slug}.mp3` : `${slug}-chapter-${chapter}.mp3`;

      // auto-click the link to trigger a download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setError("failed to download. sry bestie.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div>
      <button
        className={`btn btn-primary ${classNames}`}
        disabled={isDownloading} onClick={handleDownload}>
        {isDownloading
          ? "downloading..."
          : type === "full"
            ? "download full audiobook"
            : `download chapter ${chapter}`}
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
