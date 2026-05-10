import React, { useState } from 'react';
import {
  Popover,
  Button,
  Switch,
  Divider,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  Stack,
  FormControl,
} from '@mui/material';

// Import Icons from MUI
import TuneIcon from '@mui/icons-material/Tune';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import type { SortFilter } from '../../types/filter.type';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'; 
import type { SelectChangeEvent } from '@mui/material';


interface DisplaySettingsProps {
  sortFilter: SortFilter;
  onSortChange: (filter: SortFilter) => void;
  viewMode: 'card' | 'row';
  onViewModeChange: (mode: 'card' | 'row') => void;
}

const DisplaySettingsButton: React.FC<DisplaySettingsProps> = ({ 
  sortFilter,
  onSortChange,
  viewMode,
  onViewModeChange
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelectSortChange = (event: SelectChangeEvent) => {
    const [newSortBy, newSortOrder] = event.target.value.split('-');
    onSortChange({ sortBy: newSortBy, sortOrder: newSortOrder });
  };


  const open = Boolean(anchorEl);
  const id = open ? 'display-settings-popover' : undefined;
  const currentSortValue = `${sortFilter.sortBy}-${sortFilter.sortOrder}`;

  return (
    <>
      <Button
        aria-describedby={id}
        variant="outlined"
        color="inherit"
        onClick={handleClick}
        startIcon={<TuneIcon />}
        sx={{ textTransform: 'none', borderColor: 'grey.300', color: 'text.primary' }}
      >
        Display
      </Button>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
            }
          }
        }}
      >
        {/* Content inside Popover */}
        <Box sx={{ width: 320, p: 2 }}>
          {/* Layout (Cards / Rows) */}
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button
              variant={viewMode === 'card' ? "outlined" : "text"}
              startIcon={<GridViewIcon />}
              fullWidth
              onClick={() => onViewModeChange('card')}
              color={viewMode === 'card' ? "primary" : "inherit"}
              sx={{ height: 48, textTransform: 'none', color: viewMode === 'card' ? 'primary.main' : 'text.secondary' }}
            >
              Cards
            </Button>
            <Button
              variant={viewMode === 'row' ? "outlined" : "text"}
              startIcon={<ViewListIcon />}
              fullWidth
              onClick={() => onViewModeChange('row')}
              color={viewMode === 'row' ? "primary" : "inherit"}
              sx={{ height: 48, textTransform: 'none', color: viewMode === 'row' ? 'primary.main' : 'text.secondary' }}
            >
              Rows
            </Button>
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          {/* Ordering */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2">Ordering</Typography>
            <FormControl size="small" sx={{ minWidth: 140 }}>
             <Select 
                value={currentSortValue} 
                onChange={handleSelectSortChange}
              >
                <MenuItem value="createdAt-desc" sx={{ display: 'flex', alignItems: 'center' }}>
                  <ArrowDownwardIcon sx={{ fontSize: 'small', mr: 1 }} />
                  Date created
                </MenuItem>
                <MenuItem value="createdAt-asc" sx={{ display: 'flex', alignItems: 'center' }}>
                  <ArrowUpwardIcon sx={{ fontSize: 'small', mr: 1 }} />
                  Date created
                </MenuItem>
                <MenuItem value="title-asc" sx={{ display: 'flex', alignItems: 'center' }}>
                  <ArrowDownwardIcon sx={{ fontSize: 'small', mr: 1 }} />
                  Title (A-Z)
                </MenuItem>
                <MenuItem value="title-desc" sx={{ display: 'flex', alignItems: 'center' }}>
                  <ArrowUpwardIcon sx={{ fontSize: 'small', mr: 1 }} />
                  Title (Z-A)
                </MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          {/* Switch */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2">Show archived links</Typography>
            <Switch size="small" />
          </Box>

          <Divider sx={{ my: 1.5 }} />

          {/* Properties Tags */}
          <Box>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontWeight: 500, mb: 1, display: 'block' }}
            >
              DISPLAY PROPERTIES
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {/* MUI dùng Chip thay cho Tag */}
              <Chip label="Short link" size="small" variant="outlined" clickable />
              <Chip label="Destination URL" size="small" variant="outlined" clickable />
              <Chip label="Title" size="small" variant="outlined" clickable />
              <Chip label="Description" size="small" variant="outlined" clickable />
              <Chip label="Created Date" size="small" variant="outlined" clickable />
            </Box>
          </Box>
        </Box>
      </Popover>
    </>
  );
};

export const DisplaySettings = React.memo(DisplaySettingsButton);

export default DisplaySettings;