import { format, parseISO } from "date-fns";

export const formatDate = (dateString: string) => {
  return format(parseISO(dateString), "MMM d, yyyy");
};

