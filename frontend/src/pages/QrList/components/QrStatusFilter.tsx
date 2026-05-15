import React, { useState } from 'react';
import {
  Button,
  Popover,
  Box,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';

interface QrStatusFilterProps {
  status: 'active' | 'inactive' | 'all';
  onChange: (status: 'active' | 'inactive' | 'all') => void;
}

const QrStatusFilter: React.FC<QrStatusFilterProps> = ({ status, onChange }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value as 'active' | 'inactive' | 'all');
    handleClose();
  };

  const open = Boolean(anchorEl);
  const id = open ? 'qr-status-filter-popover' : undefined;

  const isActive = status !== 'all';

  return (
    <>
      <Button
        aria-describedby={id}
        variant="outlined"
        color="inherit"
        onClick={handleClick}
        startIcon={<FilterListIcon fontSize="small" />}
        sx={{
          textTransform: 'none',
          borderColor: 'grey.300',
          color: 'text.primary',
          position: 'relative',
        }}
      >
        Status
        {isActive && (
          <Box
            component="span"
            sx={{
              ml: 1,
              px: 0.8,
              py: 0.1,
              bgcolor: '#3182CE',
              color: 'white',
              borderRadius: '10px',
              fontSize: '0.7rem',
              fontWeight: 700,
              lineHeight: '1.4',
            }}
          >
            1
          </Box>
        )}
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
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              p: 2,
              width: 200,
              borderRadius: '12px',
              boxShadow: '0px 8px 32px rgba(0,0,0,0.12)',
            },
          },
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Filter by Status
        </Typography>
        <Divider sx={{ mb: 1.5 }} />
        <RadioGroup value={status} onChange={handleChange}>
          <FormControlLabel
            value="all"
            control={<Radio size="small" />}
            label={<Typography variant="body2">All</Typography>}
          />
          <FormControlLabel
            value="active"
            control={<Radio size="small" />}
            label={<Typography variant="body2">Active</Typography>}
          />
          <FormControlLabel
            value="inactive"
            control={<Radio size="small" />}
            label={<Typography variant="body2">Inactive</Typography>}
          />
        </RadioGroup>
      </Popover>
    </>
  );
};

export default QrStatusFilter;
