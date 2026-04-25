import React, { useState, useEffect } from 'react';
import {
  Popover, Button, Box, Typography, IconButton, Divider,
  Chip, MenuItem, Select, RadioGroup, FormControlLabel,
  Radio, OutlinedInput, type SelectChangeEvent,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';

import type { LinkFilters } from '../types/filter.type';

// ─── Types ───────────────────────────────────────────────
type ExpirationValue = 'expired' | 'expiring' | 'no_expiration' | '';

const INITIAL_STATE: LinkFilters = {
  tags: [],
  attachedQR: 'all',
  expiration: '',
};

interface FilterPopoverProps {
  filter: LinkFilters;
  onFilterChange: (filter: LinkFilters) => void;
}

const TAG_OPTIONS = ['Marketing', 'Campaign', 'Social', 'Product', 'Internal', 'Partner'];

const QR_OPTIONS = [
  { value: 'all',      label: 'Links with or without attached QR Codes' },
  { value: 'with',     label: 'Links with attached QR Codes' },
  { value: 'without',  label: 'Links without attached QR Codes' },
];

const EXPIRATION_OPTIONS = [
  { value: 'expired',       label: 'Expired' },
  { value: 'expiring',      label: 'Expiring' },
  { value: 'no_expiration', label: 'No expiration' },
];

// ─── Sub-components ───────────────────────────────────────
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <Typography
    variant="subtitle2"
    sx={{ fontWeight: 700, color: '#1A202C', mb: 1, fontSize: '0.875rem' }}
  >
    {children}
  </Typography>
);

// ─── Main Component ───────────────────────────────────────
const FilterPopover: React.FC<FilterPopoverProps> = ({ filter, onFilterChange }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [filters, setFilters] = useState<LinkFilters>(filter);

  useEffect(() => {
    if (anchorEl) {
      setFilters(filter);
    }
  }, [anchorEl, filter]);

  const open = Boolean(anchorEl);

  const activeFilterCount =
    filter.tags.length +
    (filter.attachedQR !== 'all' ? 1 : 0) +
    (filter.expiration ? 1 : 0);

  // ── Handlers ──
  const handleTagChange = (e: SelectChangeEvent<string[]>) => {
    const val = e.target.value;
    setFilters((prev) => ({ ...prev, tags: typeof val === 'string' ? val.split(',') : val }));
  };

  const handleTagDelete = (tag: string) =>
    setFilters((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));

  const handleQRChange = (e: SelectChangeEvent) =>
    setFilters((prev) => ({ ...prev, attachedQR: e.target.value }));

  const handleExpirationChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFilters((prev) => ({ ...prev, expiration: e.target.value as ExpirationValue }));

  const handleClearAll = () => setFilters(INITIAL_STATE);
  const handleClose    = () => setAnchorEl(null);

  const handleApply = () => {
    onFilterChange(filters);
    handleClose();
  };

  // ── Shared Select styles ──
  const selectSx = {
    bgcolor: 'white',
    borderRadius: '8px',
    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E2E8F0' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#CBD5E0' },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#3182CE' },
  };

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="outlined"
        color="inherit"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        startIcon={<FilterListIcon fontSize="small" />}
        sx={{
          textTransform: 'none',
          borderColor: 'grey.300',
          color: 'text.primary',
          position: 'relative',
        }}
      >
        Filters
        {activeFilterCount > 0 && (
          <Box
            component="span"
            sx={{
              ml: 1, px: 0.8, py: 0.1,
              bgcolor: '#3182CE', color: 'white',
              borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700,
              lineHeight: '1.4',
            }}
          >
            {activeFilterCount}
          </Box>
        )}
      </Button>

      {/* Popover */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: { borderRadius: '12px', mt: 1, boxShadow: '0px 8px 32px rgba(0,0,0,0.12)', width: 380 },
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1.125rem', color: '#1A202C' }}>
              Filters
            </Typography>
            <IconButton onClick={handleClose} size="small" sx={{ color: 'grey.400' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Tags */}
          <Box sx={{ mb: 3 }}>
            <SectionLabel>Tags</SectionLabel>
            <Select<string[]>
              multiple
              displayEmpty
              fullWidth
              size="small"
              value={filters.tags}
              onChange={handleTagChange}
              input={<OutlinedInput />}
              sx={selectSx}
              renderValue={(selected) =>
                selected.length === 0 ? (
                  <Typography sx={{ color: '#A0AEC0', fontSize: '0.875rem' }}>
                    Select tags
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        onDelete={() => handleTagDelete(tag)}
                        onMouseDown={(e) => e.stopPropagation()}
                        sx={{
                          bgcolor: '#EBF8FF', color: '#2B6CB0',
                          border: '1px solid #BEE3F8', height: 22,
                          '& .MuiChip-deleteIcon': { color: '#63B3ED', fontSize: '14px' },
                        }}
                      />
                    ))}
                  </Box>
                )
              }
            >
              {TAG_OPTIONS.map((tag) => (
                <MenuItem key={tag} value={tag} sx={{ fontSize: '0.875rem' }}>
                  {tag}
                </MenuItem>
              ))}
            </Select>
          </Box>

          {/* Attached QR Code */}
          <Box sx={{ mb: 3 }}>
            <SectionLabel>Attached QR Code</SectionLabel>
            <Select
              fullWidth
              size="small"
              value={filters.attachedQR}
              onChange={handleQRChange}
              sx={selectSx}
            >
              {QR_OPTIONS.map(({ value, label }) => (
                <MenuItem key={value} value={value} sx={{ fontSize: '0.875rem' }}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </Box>

          {/* Link Expiration */}
          <Box sx={{ mb: 3 }}>
            <SectionLabel>Link expiration</SectionLabel>
            <RadioGroup
              row
              value={filters.expiration}
              onChange={handleExpirationChange}
              sx={{ gap: 0.5 }}
            >
              {EXPIRATION_OPTIONS.map(({ value, label }) => (
                <FormControlLabel
                  key={value}
                  value={value}
                  control={
                    <Radio
                      size="small"
                      sx={{
                        color: '#CBD5E0',
                        '&.Mui-checked': { color: '#3182CE' },
                        p: '6px',
                      }}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: '0.875rem', color: '#4A5568' }}>
                      {label}
                    </Typography>
                  }
                />
              ))}
            </RadioGroup>
          </Box>

          {/* Footer */}
          <Divider sx={{ mx: -3, mb: 2.5 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Button
              startIcon={<ClearIcon fontSize="small" />}
              onClick={handleClearAll}
              size="small"
              sx={{
                textTransform: 'none', color: '#4A5568', fontWeight: 500,
                '&:hover': { bgcolor: '#F7FAFC' },
              }}
            >
              Clear all filters
            </Button>

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                onClick={handleClose}
                size="small"
                sx={{
                  textTransform: 'none', color: '#4A5568',
                  borderColor: '#E2E8F0', borderRadius: '8px',
                  '&:hover': { borderColor: '#CBD5E0', bgcolor: '#F7FAFC' },
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleApply}
                size="small"
                sx={{
                  textTransform: 'none', borderRadius: '8px',
                  bgcolor: '#3182CE', fontWeight: 600,
                  '&:hover': { bgcolor: '#2B6CB0' },
                  boxShadow: 'none',
                }}
              >
                Apply
              </Button>
            </Box>
          </Box>
        </Box>
      </Popover>
    </>
  );
};

export default FilterPopover;