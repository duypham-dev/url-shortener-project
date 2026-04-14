import { format, parseISO } from "date-fns";

export const formatDate = (dateString: string) => {
  return format(parseISO(dateString), "MMM d, yyyy");
};


// export const formatDate = (dateString: string) => {
//   const d = new Date(dateString);
//   return d.toLocaleDateString("en-US", {
//     month: "short",
//     day: "numeric",
//     year: "numeric",
//   });
// };
