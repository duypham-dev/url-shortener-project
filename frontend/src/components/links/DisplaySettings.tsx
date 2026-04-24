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

// Import Icons từ MUI
import TuneIcon from '@mui/icons-material/Tune';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';

const DisplaySettingsButton: React.FC = () => {
  // MUI dùng anchorEl (DOM node) thay vì boolean để xác định vị trí neo Popover
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'display-settings-popover' : undefined;

  return (
    <>
      <Button
        aria-describedby={id}
        variant="outlined"
        color="inherit"
        onClick={handleClick}
        startIcon={<TuneIcon />}
        sx={{ textTransform: 'none' }} // Tắt tính năng tự động viết hoa toàn bộ chữ của MUI
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
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        {/* Nội dung bên trong Popover */}
        <Box sx={{ width: 320, p: 2 }}>
          {/* Phần 1: Chọn Layout (Cards / Rows) */}
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<GridViewIcon />}
              fullWidth
              sx={{ height: 48, textTransform: 'none' }}
            >
              Cards
            </Button>
            <Button
              variant="text"
              startIcon={<ViewListIcon />}
              color="inherit"
              fullWidth
              sx={{ height: 48, textTransform: 'none', color: 'text.secondary' }}
            >
              Rows
            </Button>
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          {/* Phần 2: Ordering */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2">Ordering</Typography>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select defaultValue="date">
                <MenuItem value="date">Date created</MenuItem>
                <MenuItem value="name">Name</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          {/* Phần 3: Switch */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2">Show archived links</Typography>
            <Switch size="small" />
          </Box>

          <Divider sx={{ my: 1.5 }} />

          {/* Phần 4: Properties Tags */}
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