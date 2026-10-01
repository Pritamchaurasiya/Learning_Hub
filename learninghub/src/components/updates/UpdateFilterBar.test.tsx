import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../test/test-utils';
import { UpdateFilterBar } from './UpdateFilterBar';

describe('UpdateFilterBar', () => {
  it('renders search input and triggers onSearchChange on user input', () => {
    const handleSearchChange = vi.fn();
    render(
      <UpdateFilterBar
        searchQuery=""
        onSearchChange={handleSearchChange}
      />
    );

    const input = screen.getByPlaceholderText(/Search notices, circulars, exams/i);
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Examination' } });
    expect(handleSearchChange).toHaveBeenCalledWith('Examination');
  });

  it('renders category pill buttons and triggers selection callback', () => {
    const handleCategorySelect = vi.fn();
    render(
      <UpdateFilterBar
        searchQuery=""
        onSearchChange={vi.fn()}
        selectedCategory=""
        onCategorySelect={handleCategorySelect}
      />
    );

    expect(screen.getByRole('button', { name: 'All Categories' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Examinations' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scholarships' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Examinations' }));
    expect(handleCategorySelect).toHaveBeenCalledWith('EXAMINATION');
  });

  it('toggles urgent importance filter', () => {
    const handleImportanceSelect = vi.fn();
    render(
      <UpdateFilterBar
        searchQuery=""
        onSearchChange={vi.fn()}
        selectedImportance=""
        onImportanceSelect={handleImportanceSelect}
      />
    );

    const urgentBtn = screen.getByRole('button', { name: /^Urgent/i });
    fireEvent.click(urgentBtn);
    expect(handleImportanceSelect).toHaveBeenCalledWith('URGENT');
  });

  it('renders reset filters button and triggers onResetFilters callback', () => {
    const handleResetFilters = vi.fn();
    render(
      <UpdateFilterBar
        searchQuery="test"
        onSearchChange={vi.fn()}
        hasActiveFilters={true}
        onResetFilters={handleResetFilters}
      />
    );

    const resetBtn = screen.getByRole('button', { name: /Reset/i });
    expect(resetBtn).toBeInTheDocument();

    fireEvent.click(resetBtn);
    expect(handleResetFilters).toHaveBeenCalled();
  });
});
