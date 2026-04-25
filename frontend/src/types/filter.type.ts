export interface DateFilter {
  startDate: Date | null;
  endDate: Date | null;
}

export interface LinkFilters {
  tags: string[];
  attachedQR: string;
  expiration: string;
}

export interface LinksQueryParams {
  search: string;
  dateFilter: DateFilter;
  linkFilters: LinkFilters;
}

export const INITIAL_DATE_FILTER: DateFilter = { startDate: null, endDate: null };
export const INITIAL_LINK_FILTERS: LinkFilters = { tags: [], attachedQR: 'all', expiration: '' };