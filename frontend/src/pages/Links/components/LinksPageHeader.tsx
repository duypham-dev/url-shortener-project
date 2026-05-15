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
        className="bg-[#232323] hover:bg-black text-gray-200 hover:text-white font-medium py-2 px-5 rounded-md transition-colors shadow-sm"
      >
        Create link
      </button>
    </div>
  );
};

export const LinksPageHeader = React.memo(LinksPageHeaderComponent);

export default LinksPageHeader;
