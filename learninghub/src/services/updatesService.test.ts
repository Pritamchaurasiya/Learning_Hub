import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updatesService, DEMO_STUDENT_UPDATES, DEMO_SOURCES } from './updatesService';
import * as apiModule from '../utils/api';

vi.mock('../utils/api', () => ({
  fetchApi: vi.fn(),
}));

describe('updatesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUpdates', () => {
    it('returns API data when API responds successfully', async () => {
      const mockApiData = [{ id: 'api-1', title: 'API Update 1' }];
      vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({
        data: mockApiData,
        count: 1,
      });

      const result = await updatesService.getUpdates();
      expect(result).toEqual(mockApiData);
      expect(apiModule.fetchApi).toHaveBeenCalledWith(expect.stringContaining('/api/v1/updates/'));
    });

    it('falls back to DEMO_STUDENT_UPDATES when API fails', async () => {
      vi.mocked(apiModule.fetchApi).mockRejectedValueOnce(new Error('Network error'));

      const result = await updatesService.getUpdates();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].id).toBe(DEMO_STUDENT_UPDATES[0].id);
    });

    it('filters fallback updates by category', async () => {
      vi.mocked(apiModule.fetchApi).mockRejectedValueOnce(new Error('Network offline'));

      const result = await updatesService.getUpdates({ category: 'EXAMINATION' });
      expect(result.every(u => u.category === 'EXAMINATION')).toBe(true);
    });

    it('filters fallback updates by search term', async () => {
      vi.mocked(apiModule.fetchApi).mockRejectedValueOnce(new Error('Network offline'));

      const result = await updatesService.getUpdates({ search: 'MGKVP' });
      expect(result.length).toBeGreaterThan(0);
      expect(
        result.every(
          u =>
            u.title.toLowerCase().includes('mgkvp') ||
            u.summary.toLowerCase().includes('mgkvp') ||
            u.institution.toLowerCase().includes('mgkvp')
        )
      ).toBe(true);
    });

    it('filters fallback updates by importance', async () => {
      vi.mocked(apiModule.fetchApi).mockRejectedValueOnce(new Error('Network offline'));

      const result = await updatesService.getUpdates({ importance: 'URGENT' });
      expect(result.every(u => u.importance === 'URGENT')).toBe(true);
    });

    it('filters fallback updates with onlyDeadlines flag', async () => {
      vi.mocked(apiModule.fetchApi).mockRejectedValueOnce(new Error('Network offline'));

      const result = await updatesService.getUpdates({ onlyDeadlines: true });
      expect(result.every(u => Boolean(u.deadline))).toBe(true);
    });
  });

  describe('getPersonalizedFeed', () => {
    it('returns API personalized updates when available', async () => {
      const mockPersonalized = [{ id: 'p-1', title: 'Personalized 1' }];
      vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({ data: mockPersonalized });

      const res = await updatesService.getPersonalizedFeed();
      expect(res).toEqual(mockPersonalized);
    });

    it('falls back to top demo updates when API fails', async () => {
      vi.mocked(apiModule.fetchApi).mockRejectedValueOnce(new Error('Server error'));

      const res = await updatesService.getPersonalizedFeed();
      expect(res.length).toBeLessThanOrEqual(4);
      expect(res.length).toBeGreaterThan(0);
    });
  });

  describe('getUpcomingDeadlines', () => {
    it('returns API deadlines when available', async () => {
      const mockDeadlines = [{ id: 'd-1', deadline: '2026-10-15T00:00:00Z' }];
      vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({ data: mockDeadlines });

      const res = await updatesService.getUpcomingDeadlines();
      expect(res).toEqual(mockDeadlines);
    });

    it('returns sorted fallback items with deadlines when API fails', async () => {
      vi.mocked(apiModule.fetchApi).mockRejectedValueOnce(new Error('Down'));

      const res = await updatesService.getUpcomingDeadlines();
      expect(res.every(u => Boolean(u.deadline))).toBe(true);
      for (let i = 0; i < res.length - 1; i++) {
        expect(new Date(res[i].deadline!).getTime()).toBeLessThanOrEqual(
          new Date(res[i + 1].deadline!).getTime()
        );
      }
    });
  });

  describe('getUpdateById', () => {
    it('returns update from API when found', async () => {
      const mockItem = { id: 'upd-99', title: 'Notice 99' };
      vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({ data: mockItem });

      const res = await updatesService.getUpdateById('upd-99');
      expect(res).toEqual(mockItem);
    });

    it('falls back to demo record when API fails', async () => {
      vi.mocked(apiModule.fetchApi).mockRejectedValueOnce(new Error('404'));

      const firstDemo = DEMO_STUDENT_UPDATES[0];
      const res = await updatesService.getUpdateById(firstDemo.id);
      expect(res).toBeDefined();
      expect(res?.id).toBe(firstDemo.id);
    });

    it('returns null if ID does not exist in demo items either', async () => {
      vi.mocked(apiModule.fetchApi).mockRejectedValueOnce(new Error('404'));

      const res = await updatesService.getUpdateById('non-existent-id-xyz');
      expect(res).toBeNull();
    });
  });

  describe('bookmarks management', () => {
    it('fetches bookmarks from API', async () => {
      const mockBookmarks = [{ id: 'bmk-1', update_id: 'upd-1' }];
      vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({ data: mockBookmarks });

      const res = await updatesService.getBookmarks();
      expect(res).toEqual(mockBookmarks);
    });

    it('falls back to empty array on bookmark fetch failure', async () => {
      vi.mocked(apiModule.fetchApi).mockRejectedValueOnce(new Error('Auth failed'));

      const res = await updatesService.getBookmarks();
      expect(res).toEqual([]);
    });

    it('saves bookmark via API and handles fallback', async () => {
      vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({
        data: { id: 'bmk-saved-1', update_id: 'upd-1' },
      });

      const res = await updatesService.saveBookmark('upd-1', 'Important form', 'Exam');
      expect(res).toBeDefined();
      expect(res?.id).toBe('bmk-saved-1');
    });

    it('saves bookmark locally in fallback when API throws', async () => {
      vi.mocked(apiModule.fetchApi).mockRejectedValueOnce(new Error('Network down'));

      const targetId = DEMO_STUDENT_UPDATES[0].id;
      const res = await updatesService.saveBookmark(targetId, 'Check fee', 'Urgent');
      expect(res).toBeDefined();
      expect(res?.update.id).toBe(targetId);
      expect(res?.notes).toBe('Check fee');
    });

    it('removes bookmark via API and handles fallback', async () => {
      vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({});

      const ok = await updatesService.removeBookmark('upd-1');
      expect(ok).toBe(true);
    });
  });

  describe('reminders management', () => {
    it('creates reminder successfully via API', async () => {
      const mockReminder = { id: 'rem-1', reminder_type: '3_DAYS_BEFORE' };
      vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({ data: mockReminder });

      const res = await updatesService.createReminder('upd-1', '3_DAYS_BEFORE');
      expect(res).toEqual(mockReminder);
    });

    it('creates fallback reminder when API fails', async () => {
      vi.mocked(apiModule.fetchApi).mockRejectedValueOnce(new Error('Offline'));

      const targetId = DEMO_STUDENT_UPDATES[0].id;
      const res = await updatesService.createReminder(targetId, '1_DAY_BEFORE');
      expect(res).toBeDefined();
      expect(res?.reminder_type).toBe('1_DAY_BEFORE');
      expect(res?.update.id).toBe(targetId);
    });

    it('cancels reminder cleanly', async () => {
      vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({});

      const ok = await updatesService.cancelReminder('rem-1');
      expect(ok).toBe(true);
    });
  });

  describe('subscriptions & sources', () => {
    it('fetches sources from API or fallback to DEMO_SOURCES', async () => {
      vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({ data: DEMO_SOURCES });

      const res = await updatesService.getSources();
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].name).toBe(DEMO_SOURCES[0].name);
    });

    it('subscribes to target and returns record', async () => {
      vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({
        data: { id: 'sub-1', target_type: 'UNIVERSITY', target_value: 'MGKVP' },
      });

      const res = await updatesService.subscribeTarget('UNIVERSITY', 'MGKVP');
      expect(res?.id).toBe('sub-1');
    });

    it('unsubscribes target cleanly', async () => {
      vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({});

      const ok = await updatesService.unsubscribeTarget('sub-1');
      expect(ok).toBe(true);
    });
  });

  describe('getStats', () => {
    it('fetches statistics from API', async () => {
      const mockStats = {
        total_updates: 10,
        urgent_updates: 3,
        active_deadlines: 5,
        tracked_sources: 4,
      };
      vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({ data: mockStats });

      const res = await updatesService.getStats();
      expect(res).toEqual(mockStats);
    });

    it('calculates fallback stats from demo records when API fails', async () => {
      vi.mocked(apiModule.fetchApi).mockRejectedValueOnce(new Error('Service unavailable'));

      const res = await updatesService.getStats();
      expect(res.total_updates).toBe(DEMO_STUDENT_UPDATES.length);
      expect(res.tracked_sources).toBe(DEMO_SOURCES.length);
    });
  });

  describe('result watchers', () => {
    it('fetches result watchers from API', async () => {
      const mockWatchers = [{ id: 'rw-1', institution: 'MGKVP', course: 'BCA', status: 'ACTIVE' }];
      vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({ data: mockWatchers });

      const res = await updatesService.getResultWatchers();
      expect(res).toEqual(mockWatchers);
      expect(apiModule.fetchApi).toHaveBeenCalledWith('/api/v1/updates/result-watchers/');
    });

    it('creates result watcher via API and returns created entity', async () => {
      const payload = { institution: 'AKTU', course: 'B.Tech', semester: '4th', roll_number: '12345' };
      const created = { id: 'rw-2', ...payload, status: 'ACTIVE' };
      vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({ data: created });

      const res = await updatesService.createResultWatcher(payload);
      expect(res).toEqual(created);
    });

    it('cancels result watcher cleanly', async () => {
      vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({});

      const ok = await updatesService.cancelResultWatcher('rw-1');
      expect(ok).toBe(true);
    });
  });

  describe('notification preferences', () => {
    it('fetches notification preferences from API', async () => {
      const mockPrefs = {
        quiet_hours_enabled: true,
        quiet_hours_start: '22:00:00',
        quiet_hours_end: '07:00:00',
        max_daily_push: 4,
      };
      vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({ data: mockPrefs });

      const res = await updatesService.getNotificationPreferences();
      expect(res).toEqual(mockPrefs);
    });

    it('updates notification preferences via PATCH', async () => {
      const patch = { quiet_hours_enabled: false, max_daily_push: 5 };
      vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({ data: { ...patch, id: 'pref-1' } });

      const res = await updatesService.updateNotificationPreferences(patch);
      expect(res?.max_daily_push).toBe(5);
    });
  });
});

