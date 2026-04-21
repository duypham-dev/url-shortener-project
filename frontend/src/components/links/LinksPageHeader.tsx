import React from "react";

interface LinksPageHeaderProps {
  onCreateLink: () => void;
}

const LinksPageHeaderComponent: React.FC<LinksPageHeaderProps> = ({
  onCreateLink,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
        Short Links
      </h1>
      <button
        type="button"
        onClick={onCreateLink}
        className="bg-[#0f34a3] hover:bg-[#0c2a86] text-white font-medium py-2 px-5 rounded-md transition-colors shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
      >
        Create link
      </button>
    </div>
  );
};

export const LinksPageHeader = React.memo(LinksPageHeaderComponent);

export default LinksPageHeader;
