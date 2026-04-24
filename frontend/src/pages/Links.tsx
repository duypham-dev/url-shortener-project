import React, { useCallback, useDeferredValue, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLinks } from "../hooks/useLinks";
import LinksPageHeader from "../components/links/LinksPageHeader";
import LinksFilterToolbar from "../components/links/LinksFilterToolbar";
import LinksSecondaryToolbar from "../components/links/LinksSecondaryToolbar";
import LinksListCanvas from "../components/links/LinksListCanvas";

export const Links: React.FC = () => {
  const { links, isLoading, error } = useLinks();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOptions, setFilterOptions] = useState({
    search: "",
    dateRange: "all_time",
  });
  const deferredSearchTerm = useDeferredValue(searchTerm);

  // Navigate to the link creation page when "Create link" button is clicked
  const handleCreateLink = useCallback(() => {
    navigate("/dashboard/links/create");
  }, [navigate]);


  const handleSearchTermChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto py-2 font-sans text-gray-900 pb-20">
      <LinksPageHeader onCreateLink={handleCreateLink} />

      <LinksFilterToolbar
        searchTerm={searchTerm}
        onSearchTermChange={handleSearchTermChange}
      />

      <LinksSecondaryToolbar />

      <LinksListCanvas
        links={links}
        isLoading={isLoading}
        error={error}
        searchTerm={deferredSearchTerm}
      />
    </div>
  );
};

export default Links;
