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
      const { container } = render(<CourseCardSkeleton />)
      const skeletons = container.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('StatCardSkeleton', () => {
    it('renders stats skeleton', () => {
      const { container } = render(<StatCardSkeleton />)
      const skeletons = container.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('TableSkeleton', () => {
    it('renders table with default 5 rows', () => {
      const { container } = render(<TableSkeleton />)
      const rows = container.querySelectorAll('.animate-pulse')
      expect(rows.length).toBeGreaterThan(0)
    })

    it('renders table with specified rows', () => {
      const { container } = render(<TableSkeleton rows={3} />)
      expect(container.querySelector('.space-y-3')).toBeInTheDocument()
    })
  })

  describe('FormSkeleton', () => {
    it('renders form with default 4 fields', () => {
      const { container } = render(<FormSkeleton />)
      const inputs = container.querySelectorAll('.h-10')
      expect(inputs.length).toBeGreaterThan(0)
    })

    it('renders form with specified fields', () => {
      const { container } = render(<FormSkeleton fields={2} />)
      expect(container.querySelector('.space-y-4')).toBeInTheDocument()
    })
  })

  describe('ProfileSkeleton', () => {
    it('renders profile skeleton structure', () => {
      const { container } = render(<ProfileSkeleton />)
      expect(container.querySelector('.rounded-full')).toBeInTheDocument()
      expect(container.querySelector('.grid')).toBeInTheDocument()
    })
  })

  describe('ListSkeleton', () => {
    it('renders list with default 5 items', () => {
      const { container } = render(<ListSkeleton />)
      expect(container.querySelector('.space-y-3')).toBeInTheDocument()
    })

    it('renders list with specified items', () => {
      const { container } = render(<ListSkeleton items={3} />)
      expect(container.querySelector('.space-y-3')).toBeInTheDocument()
    })
  })

  describe('PageSkeleton', () => {
    it('renders full page skeleton', () => {
      const { container } = render(<PageSkeleton />)
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    })
  })
})
