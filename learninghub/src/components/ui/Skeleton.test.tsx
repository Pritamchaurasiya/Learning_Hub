import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Skeleton,
  CourseCardSkeleton,
  StatCardSkeleton,
  TableSkeleton,
  FormSkeleton,
  ProfileSkeleton,
  ListSkeleton,
  PageSkeleton,
} from './Skeleton'

describe('Skeleton Components', () => {
  describe('Skeleton', () => {
    it('renders with default classes', () => {
      render(<Skeleton data-testid="skeleton" />)
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('animate-pulse', 'bg-gray-200', 'rounded-md')
    })

    it('applies custom className', () => {
      render(<Skeleton className="custom-class" data-testid="skeleton" />)
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('custom-class')
    })
  })

  describe('CourseCardSkeleton', () => {
    it('renders card skeleton structure', () => {
      render(<CourseCardSkeleton />)
      // CourseCardSkeleton should have multiple skeleton elements
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('StatCardSkeleton', () => {
    it('renders stats skeleton', () => {
      render(<StatCardSkeleton />)
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('TableSkeleton', () => {
    it('renders table with default 5 rows', () => {
      render(<TableSkeleton />)
      const rows = document.querySelectorAll('.animate-pulse')
      expect(rows.length).toBeGreaterThan(0)
    })

    it('renders table with specified rows', () => {
      render(<TableSkeleton rows={3} />)
      expect(document.querySelector('.space-y-3')).toBeInTheDocument()
    })
  })

  describe('FormSkeleton', () => {
    it('renders form with default 4 fields', () => {
      render(<FormSkeleton />)
      const inputs = document.querySelectorAll('.h-10')
      expect(inputs.length).toBeGreaterThan(0)
    })

    it('renders form with specified fields', () => {
      render(<FormSkeleton fields={2} />)
      expect(document.querySelector('.space-y-4')).toBeInTheDocument()
    })
  })

  describe('ProfileSkeleton', () => {
    it('renders profile skeleton structure', () => {
      render(<ProfileSkeleton />)
      expect(document.querySelector('.rounded-full')).toBeInTheDocument()
      expect(document.querySelector('.grid')).toBeInTheDocument()
    })
  })

  describe('ListSkeleton', () => {
    it('renders list with default 5 items', () => {
      render(<ListSkeleton />)
      expect(document.querySelector('.space-y-3')).toBeInTheDocument()
    })

    it('renders list with specified items', () => {
      render(<ListSkeleton items={3} />)
      expect(document.querySelector('.space-y-3')).toBeInTheDocument()
    })
  })

  describe('PageSkeleton', () => {
    it('renders full page skeleton', () => {
      render(<PageSkeleton />)
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
    })
  })
})
