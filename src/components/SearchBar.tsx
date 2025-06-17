import React, { useState, useCallback } from 'react';
import { TextField, InputAdornment, SxProps, Theme } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import debounce from 'lodash/debounce';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  sx?: SxProps<Theme>;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, placeholder = 'Search...', sx }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      onSearch(query);
    }, 300),
    [onSearch]
  );

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setSearchTerm(query);
    debouncedSearch(query);
  };

  return (
    <TextField
      fullWidth
      value={searchTerm}
      onChange={handleSearch}
      placeholder={placeholder}
      variant="outlined"
      size="small"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
      }}
      sx={sx}
    />
  );
}; 