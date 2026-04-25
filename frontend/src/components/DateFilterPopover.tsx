import React, { useState } from "react";
import {
  Popover,
  Button,
  Box,
  Typography,
  IconButton,
  TextField,
  Stack,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  format,
  subDays,
  subHours,
  startOfDay,
  isBefore,
  isWithinInterval,
  isSameDay,
} from "date-fns";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { PickerDay } from "@mui/x-date-pickers/PickerDay";
import type { DateFilter } from "../types/filter.type";

// --- Custom Day Component ---
// Define RangeDayProps (PickerDayProps no longer generic)
interface RangeDayProps {
  day: Date;
  start: Date | null;
  end: Date | null;
  [key: string]: unknown; 
}

const RangeDay = ({ day, start, end, ...props }: RangeDayProps) => {
  const isStart = start ? isSameDay(day, start) : false;
  const isEnd = end ? isSameDay(day, end) : false;
  const isSingle = isStart && isEnd;

  const normalizedRange =
    start && end
      ? isBefore(start, end)
        ? { start, end }
        : { start: end, end: start }
      : null;

  const isInRange =
    !isSingle && normalizedRange
      ? isWithinInterval(day, normalizedRange)
      : false;

  const isEndpoint = isStart || isEnd;

  return (
    <Box
      sx={{
        ...((isInRange || isEndpoint) &&
          !isSingle && {
            bgcolor: "#BEE3F8",
            borderRadius: 0,
          }),
        ...(isStart &&
          !isSingle && {
            borderTopLeftRadius: "50%",
            borderBottomLeftRadius: "50%",
          }),
        ...(isEnd &&
          !isSingle && {
            borderTopRightRadius: "50%",
            borderBottomRightRadius: "50%",
          }),
      }}
    >
      <PickerDay
        {...(props as unknown as React.ComponentProps<typeof PickerDay>)}
        day={day}
        selected={isEndpoint}   
        sx={{
          m: 0,
          borderRadius: "50%",
          // Override .Mui-selected to use custom color instead of default MUI color
          "&.Mui-selected": {
            bgcolor: "#3182CE",
            color: "white",
            "&:hover": { bgcolor: "#2B6CB0" },
            "&:focus": { bgcolor: "#3182CE" },
          },
          ...(isInRange &&
            !isEndpoint && {
              bgcolor: "transparent",
              color: "#2B6CB0",
            }),
        }}
      />
    </Box>
  );
};

// ─────────────────────────────────────────

const TODAY = new Date();

const SHORTCUTS = [
  { label: "Last hour", getStart: () => subHours(new Date(), 1) },
  { label: "Today", getStart: () => startOfDay(new Date()) },
  { label: "Last 7 days", getStart: () => subDays(new Date(), 7) },
  { label: "Last 30 days", getStart: () => subDays(new Date(), 30) },
  { label: "Last 60 days", getStart: () => subDays(new Date(), 60) },
  { label: "Last 90 days", getStart: () => subDays(new Date(), 90) },
];

interface DateFilterPopoverProps {
  filter: DateFilter;
  onFilterChange: (filter: DateFilter) => void;
}

const DateFilterPopover: React.FC<DateFilterPopoverProps> = ({
  filter,
  onFilterChange,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(filter.startDate);
  const [endDate, setEndDate] = useState<Date | null>(filter.endDate);
  const [selectionStep, setSelectionStep] = useState<"first" | "second">(
    "first",
  );

  React.useEffect(() => {
    if (anchorEl) {
      setStartDate(filter.startDate);
      setEndDate(filter.endDate);
      setSelectionStep("first");
    }
  }, [anchorEl, filter]);

  const open = Boolean(anchorEl);

  const handleCalendarChange = (date: Date | null) => {
    if (!date) return;

    if (selectionStep === "first") {
      setStartDate(date);
      setEndDate(date);
      setSelectionStep("second");
    } else {
      if (isBefore(date, startDate!)) {
        setStartDate(date);
      } else {
        setEndDate(date);
      }
      setSelectionStep("first");
    }
  };

  const handleShortcut = (getStart: () => Date) => {
    setStartDate(getStart());
    setEndDate(new Date());
    setSelectionStep("first");
  };

  const handleClose = () => setAnchorEl(null);

  const handleApply = () => {
    onFilterChange({ startDate, endDate });
    handleClose();
  };

  const formatDate = (date: Date | null) =>
    date ? format(date, "dd/MM/yyyy") : "";

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Button
        variant="outlined"
        color="inherit"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        startIcon={<CalendarTodayIcon fontSize="small" />}
        sx={{
          textTransform: "none",
          borderColor: "grey.300",
          color: "text.primary",
        }}
      >
        {filter.startDate && filter.endDate
          ? filter.startDate == filter.endDate
            ? formatDate(filter.startDate)
            : `${formatDate(filter.startDate)} - ${formatDate(filter.endDate)}`
          : "Filter by created date"}
      </Button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              mt: 1,
              boxShadow: "0px 4px 20px rgba(0,0,0,0.1)",
            },
          },
        }}
      >
        <Box sx={{ width: 400, p: 3 }}>
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#1A202C" }}>
              Filter by created date
            </Typography>
            <IconButton
              onClick={handleClose}
              size="small"
              sx={{ color: "grey.500" }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Date Inputs */}
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              size="small"
              fullWidth
              value={formatDate(startDate)}
              placeholder="Start date"
              sx={{ bgcolor: "#F7FAFC" }}
            />
            <TextField
              size="small"
              fullWidth
              value={formatDate(endDate)}
              placeholder="End date"
              sx={{ bgcolor: "#F7FAFC" }}
            />
          </Stack>

          {/* Calendar */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mb: 2,
              "& .MuiDateCalendar-root": { width: "100%" },
            }}
          >
            <DateCalendar
              value={startDate}
              onChange={handleCalendarChange}
              maxDate={TODAY}
              views={["day"]}
              slots={{
                day: (props) => (
                  <RangeDay {...props} start={startDate} end={endDate} />
                ),
              }}
            />
          </Box>

          {/* Shortcuts */}
          <Box sx={{ bgcolor: "#F8FAFC", p: 2, borderRadius: 2, mb: 3 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {SHORTCUTS.map(({ label, getStart }) => (
                <Button
                  key={label}
                  variant="outlined"
                  size="small"
                  onClick={() => handleShortcut(getStart)}
                  sx={{
                    bgcolor: "white",
                    color: "#4A5568",
                    borderColor: "#E2E8F0",
                    textTransform: "none",
                    fontWeight: 500,
                    "&:hover": { bgcolor: "#EDF2F7", borderColor: "#CBD5E0" },
                  }}
                >
                  {label}
                </Button>
              ))}
            </Box>
          </Box>

          <Divider sx={{ mx: -3, mb: 2 }} />

          {/* Actions */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              variant="outlined"
              onClick={handleClose}
              sx={{
                textTransform: "none",
                color: "#4A5568",
                borderColor: "#E2E8F0",
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleApply}
              sx={{
                textTransform: "none",
                bgcolor: "#3182CE",
                "&:hover": { bgcolor: "#2B6CB0" },
              }}
            >
              Apply
            </Button>
          </Box>
        </Box>
      </Popover>
    </LocalizationProvider>
  );
};

export default DateFilterPopover;
