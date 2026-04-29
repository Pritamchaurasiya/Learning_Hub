import { getPaginationParams, createPaginatedResponse } from '../../src/utils/pagination';

describe('Pagination Utils', () => {
  describe('getPaginationParams', () => {
    it('should return default values when query is empty', () => {
      const result = getPaginationParams({});

      expect(result).toEqual({
        page: 1,
        limit: 20,
        skip: 0,
      });
    });

    it('should parse page and limit from query string', () => {
      const query = { page: '3', limit: '50' };
      const result = getPaginationParams(query);

      expect(result).toEqual({
        page: 3,
        limit: 50,
        skip: 100, // (3-1) * 50
      });
    });

    it('should handle page as number', () => {
      const query = { page: 2, limit: 10 };
      const result = getPaginationParams(query);

      expect(result).toEqual({
        page: 2,
        limit: 10,
        skip: 10,
      });
    });

    it('should default to page 1 when page is invalid', () => {
      const query = { page: 'invalid', limit: '20' };
      const result = getPaginationParams(query);

      expect(result.page).toBe(1);
    });

    it('should default to limit 20 when limit is invalid', () => {
      const query = { page: '1', limit: 'invalid' };
      const result = getPaginationParams(query);

      expect(result.limit).toBe(20);
    });

    it('should cap limit at 100 maximum', () => {
      const query = { page: '1', limit: '200' };
      const result = getPaginationParams(query);

      expect(result.limit).toBe(100);
    });

    it('should ensure minimum page is 1', () => {
      const query = { page: '0', limit: '20' };
      const result = getPaginationParams(query);

      expect(result.page).toBe(1);
    });

    it('should ensure minimum limit is 1', () => {
      const query = { page: '1', limit: '0' };
      const result = getPaginationParams(query);

      expect(result.limit).toBe(1);
    });

    it('should calculate skip correctly for first page', () => {
      const query = { page: '1', limit: '25' };
      const result = getPaginationParams(query);

      expect(result.skip).toBe(0);
    });

    it('should calculate skip correctly for subsequent pages', () => {
      const query = { page: '5', limit: '10' };
      const result = getPaginationParams(query);

      expect(result.skip).toBe(40); // (5-1) * 10
    });
  });

  describe('createPaginatedResponse', () => {
    it('should create response with correct metadata', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const total = 50;
      const page = 2;
      const limit = 20;

      const result = createPaginatedResponse(data, total, page, limit);

      expect(result).toEqual({
        status: 'success',
        data,
        meta: {
          total: 50,
          page: 2,
          limit: 20,
          pages: 3, // ceil(50/20)
          hasNext: true, // 2 < 3
          hasPrev: true, // 2 > 1
        },
      });
    });

    it('should handle first page correctly', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const total = 30;
      const page = 1;
      const limit = 10;

      const result = createPaginatedResponse(data, total, page, limit);

      expect(result.meta.hasPrev).toBe(false);
      expect(result.meta.hasNext).toBe(true);
    });

    it('should handle last page correctly', () => {
      const data = [{ id: 1 }];
      const total = 21;
      const page = 3;
      const limit = 10;

      const result = createPaginatedResponse(data, total, page, limit);

      expect(result.meta.hasPrev).toBe(true);
      expect(result.meta.hasNext).toBe(false);
      expect(result.meta.pages).toBe(3);
    });

    it('should handle single page results', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const total = 5;
      const page = 1;
      const limit = 10;

      const result = createPaginatedResponse(data, total, page, limit);

      expect(result.meta.pages).toBe(1);
      expect(result.meta.hasNext).toBe(false);
      expect(result.meta.hasPrev).toBe(false);
    });

    it('should handle empty results', () => {
      const data: any[] = [];
      const total = 0;
      const page = 1;
      const limit = 20;

      const result = createPaginatedResponse(data, total, page, limit);

      expect(result.meta.pages).toBe(0);
      expect(result.meta.hasNext).toBe(false);
      expect(result.meta.hasPrev).toBe(false);
    });

    it('should handle total less than limit', () => {
      const data = [{ id: 1 }];
      const total = 5;
      const page = 1;
      const limit = 10;

      const result = createPaginatedResponse(data, total, page, limit);

      expect(result.meta.pages).toBe(1);
    });
  });
});
