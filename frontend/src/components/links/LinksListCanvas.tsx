import React from "react";
import { LinkCard } from "./LinkCard";
import type { LinkItem } from "../../types/url.type";

interface LinksListCanvasProps {
  links: LinkItem[];
  isLoading: boolean;
  error: string | null;
  viewMode: 'card' | 'row';
}

const LinksListCanvasComponent: React.FC<LinksListCanvasProps> = ({
  links,
  isLoading,
  error,
  viewMode,
}) => {
  return (
    <div className={`relative pt-4 min-h-[50vh] ${viewMode === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start content-start' : 'space-y-4'}`}>
      {isLoading && (
        <div className="py-20 flex justify-center text-gray-400 col-span-full">Loading links...</div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200 col-span-full">
          {error}
        </div>
      )}

      {!isLoading && !error && links.length === 0 && (
        <div className="text-center py-20 text-gray-500 col-span-full">
          No links found. Try creating one!
        </div>
      )}

      {links.map((link) => (
        <LinkCard key={link.short_code} link={link} viewMode={viewMode} />
      ))}
    </div>
  );
};

export const LinksListCanvas = React.memo(LinksListCanvasComponent);

export default LinksListCanvas;
