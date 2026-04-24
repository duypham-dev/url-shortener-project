import React, { useMemo } from "react";
import { LinkCard } from "../LinkCard";
import type { LinkItem } from "../../types/url.type";

interface LinksListCanvasProps {
  links: LinkItem[];
  isLoading: boolean;
  error: string | null;
  searchTerm: string;
}

const LinksListCanvasComponent: React.FC<LinksListCanvasProps> = ({
  links,
  isLoading,
  error,
  searchTerm,
}) => {
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const filteredLinks = useMemo(() => {
    if (!normalizedSearchTerm) {
      return links;
    }

    return links.filter((link) => {
      const title = link.title?.toLowerCase() ?? "";
      const longUrl = link.long_url.toLowerCase();
      const shortCode = link.short_code.toLowerCase();

      return (
        title.includes(normalizedSearchTerm) ||
        longUrl.includes(normalizedSearchTerm) ||
        shortCode.includes(normalizedSearchTerm)
      );
    });
  }, [links, normalizedSearchTerm]);

  return (
    <div className="space-y-4 relative pt-4 min-h-screen">
      {isLoading && (
        <div className="py-20 flex justify-center text-gray-400">Loading links...</div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
          {error}
        </div>
      )}

      {!isLoading && !error && filteredLinks.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          No links found. Try creating one!
        </div>
      )}

      {filteredLinks.map((link) => (
        <LinkCard key={link.short_code} link={link} />
      ))}
    </div>
  );
};

export const LinksListCanvas = React.memo(LinksListCanvasComponent);

export default LinksListCanvas;
