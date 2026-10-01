import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BellRing,
  Flame,
  Calendar,
  Bookmark,
  ShieldCheck,
  Search,
  Sparkles,
  ExternalLink,
  RefreshCw,
  GraduationCap,
  Building2,
  Clock,
  FileCheck2,
  Radio,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  Sliders,
} from 'lucide-react';
import { UpdateCard } from '../components/updates/UpdateCard';
import { UpdateFilterBar } from '../components/updates/UpdateFilterBar';
import { UpdateTimeline } from '../components/updates/UpdateTimeline';
import { UpdateReminderModal } from '../components/updates/UpdateReminderModal';
import { ResultWatcherModal } from '../components/updates/ResultWatcherModal';
import { NotificationPreferencesModal } from '../components/updates/NotificationPreferencesModal';
import { CollegeCircularModal } from '../components/updates/CollegeCircularModal';
import { updatesService } from '../services/updatesService';
import type {
  StudentUpdate,
  UpdateCategory,
  UpdateImportance,
  UpdateBookmark,
  UpdateSource,
  UpdatesStatistics,
  ResultWatcher,
  UpdateSubscription,
} from '../types/updates';

export const StudentUpdatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  // Tab State
  const [activeTab, setActiveTab] = useState<'feed' | 'personalized' | 'circulars' | 'deadlines' | 'watchers' | 'bookmarks' | 'sources'>('feed');

  // Filter States
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [selectedCategory, setSelectedCategory] = useState<UpdateCategory>('ALL');
  const [selectedImportance, setSelectedImportance] = useState<UpdateImportance | 'ALL'>('ALL');
  const [onlyDeadlines, setOnlyDeadlines] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState('');

  // Sync external URL search changes into local filter
  useEffect(() => {
    if (urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
    }
  }, [urlSearch]);

  // Data States
  const [updates, setUpdates] = useState<StudentUpdate[]>([]);
  const [personalizedUpdates, setPersonalizedUpdates] = useState<StudentUpdate[]>([]);
  const [collegeCirculars, setCollegeCirculars] = useState<StudentUpdate[]>([]);
  const [bookmarks, setBookmarks] = useState<UpdateBookmark[]>([]);
  const [sources, setSources] = useState<UpdateSource[]>([]);
  const [resultWatchers, setResultWatchers] = useState<ResultWatcher[]>([]);
  const [subscriptions, setSubscriptions] = useState<UpdateSubscription[]>([]);
  const [stats, setStats] = useState<UpdatesStatistics>({
    total_updates: 0,
    urgent_updates: 0,
    active_deadlines: 0,
    tracked_sources: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals State
  const [reminderModalUpdate, setReminderModalUpdate] = useState<StudentUpdate | null>(null);
  const [isResultWatcherModalOpen, setIsResultWatcherModalOpen] = useState(false);
  const [resultWatcherDefaults, setResultWatcherDefaults] = useState<{ institution?: string; course?: string }>({});
  const [isPrefModalOpen, setIsPrefModalOpen] = useState(false);
  const [isCollegeCircularModalOpen, setIsCollegeCircularModalOpen] = useState(false);

  // Load Main Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [allUpdates, personal, bmkList, srcList, statData, watchersList, subsList, circsData] = await Promise.all([
        updatesService.getUpdates({
          category: selectedCategory,
          search: searchQuery,
          institution: selectedInstitution,
          importance: selectedImportance === 'ALL' ? undefined : selectedImportance,
          onlyDeadlines,
        }),
        updatesService.getPersonalizedFeed(),
        updatesService.getBookmarks(),
        updatesService.getSources(),
        updatesService.getStats(),
        updatesService.getResultWatchers(),
        updatesService.getSubscriptions(),
        updatesService.getCollegeCirculars(),
      ]);

      setUpdates(Array.isArray(allUpdates) ? allUpdates : []);
      setPersonalizedUpdates(Array.isArray(personal) ? personal : []);
      setCollegeCirculars(Array.isArray(circsData?.results) ? circsData.results : []);
      setBookmarks(Array.isArray(bmkList) ? bmkList : []);
      setSources(Array.isArray(srcList) ? srcList : []);
      setResultWatchers(Array.isArray(watchersList) ? watchersList : []);
      setSubscriptions(Array.isArray(subsList) ? subsList : []);
      if (statData) setStats(statData);
    } catch {
      // Fallback handled by service
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory, searchQuery, selectedInstitution, selectedImportance, onlyDeadlines]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleBookmarkToggle = async (updateId: string, willBookmark: boolean) => {
    if (willBookmark) {
      const bmk = await updatesService.saveBookmark(updateId);
      if (bmk) {
        setBookmarks(prev => [bmk, ...prev]);
        setUpdates(prev =>
          prev.map(u => (u.id === updateId ? { ...u, is_bookmarked: true } : u))
        );
      }
    } else {
      await updatesService.removeBookmark(updateId);
      setBookmarks(prev => prev.filter(b => b.update.id !== updateId));
      setUpdates(prev =>
        prev.map(u => (u.id === updateId ? { ...u, is_bookmarked: false } : u))
      );
    }
  };

  const handleScheduleReminder = async (updateId: string, reminderType: string) => {
    await updatesService.createReminder(updateId, reminderType);
  };

  const handleToggleFollow = async (institution: string) => {
    const existing = subscriptions.find(
      s => s.target_type === 'INSTITUTION' && s.target_value.toLowerCase() === institution.toLowerCase()
    );

    if (existing) {
      await updatesService.unsubscribeTarget(existing.id);
      setSubscriptions(prev => prev.filter(s => s.id !== existing.id));
    } else {
      const newSub = await updatesService.subscribeTarget('INSTITUTION', institution);
      if (newSub) {
        setSubscriptions(prev => [newSub, ...prev]);
      }
    }
  };

  const handleOpenResultWatcher = (institution: string, course?: string) => {
    setResultWatcherDefaults({ institution, course });
    setIsResultWatcherModalOpen(true);
  };

  const handleWatcherCreated = (watcher: ResultWatcher) => {
    setResultWatchers(prev => [watcher, ...prev]);
  };

  const handleCancelWatcher = async (watcherId: string) => {
    await updatesService.cancelResultWatcher(watcherId);
    setResultWatchers(prev =>
      prev.map(w => (w.id === watcherId ? { ...w, status: 'CANCELLED' } : w))
    );
  };

  const isFollowing = (institution: string) =>
    subscriptions.some(
      s => s.target_type === 'INSTITUTION' && s.target_value.toLowerCase() === institution.toLowerCase()
    );

  const activeWatchersCount = resultWatchers.filter(w => w.status === 'ACTIVE').length;

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (query) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('search', query);
        return next;
      });
    } else {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('search');
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Top Banner & Header */}
      <div className="border-b border-border/60 bg-card/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Official & Verified Educational Feed
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono text-muted-foreground bg-muted">
                  MGKVP • AKTU • SSC • NTA
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
                Student Updates Hub
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
                Clutter-free, verified student updates, exam forms, timetable revisions, revaluations, and deadlines directly from official university notice boards.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setResultWatcherDefaults({});
                  setIsResultWatcherModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md"
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Watch My Result</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCollegeCircularModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-indigo-500/30 bg-indigo-50 dark:bg-indigo-950/40 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors shadow-sm"
                title="Publish Authenticated College Circular"
                aria-label="Post College Circular"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline">Post Circular</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPrefModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-accent transition-colors shadow-sm"
                title="Configure Quiet Hours & Anti-Noise Preferences"
                aria-label="Delivery Settings"
              >
                <Sliders className="w-3.5 h-3.5 text-primary" />
                <span className="hidden sm:inline">Delivery Settings</span>
              </button>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-accent transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Syncing...' : 'Sync Updates'}</span>
              </button>
            </div>
          </div>

          {/* Metrics Overview Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-border/40">
            <div className="p-3.5 rounded-xl border border-border/60 bg-card/40">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                <span>Total Notices</span>
                <FileCheck2 className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xl sm:text-2xl font-bold text-foreground">
                {stats.total_updates}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5">
              <div className="flex items-center justify-between text-red-500 text-xs mb-1 font-medium">
                <span>Urgent Notices</span>
                <Flame className="w-4 h-4" />
              </div>
              <span className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.urgent_updates}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center justify-between text-amber-500 text-xs mb-1 font-medium">
                <span>Active Deadlines</span>
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                {stats.active_deadlines}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-card/40">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                <span>Official Sources</span>
                <Building2 className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-xl sm:text-2xl font-bold text-foreground">
                {stats.tracked_sources}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border/60 pb-3 mb-6 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'feed'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <BellRing className="w-4 h-4" />
            <span>All Updates</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-primary-foreground/20 text-primary-foreground">
              {updates.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('personalized')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'personalized'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>For You</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-muted text-muted-foreground">
              {personalizedUpdates.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('circulars')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'circulars'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>College Circulars</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-muted text-muted-foreground">
              {collegeCirculars.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('watchers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'watchers'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Result Watchers</span>
            {activeWatchersCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500 text-white font-bold">
                {activeWatchersCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('deadlines')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'deadlines'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Deadlines Timeline</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bookmarks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'bookmarks'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Saved Bookmarks</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-muted text-muted-foreground">
              {bookmarks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sources')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'sources'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Official Sources</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-muted text-muted-foreground">
              {sources.length}
            </span>
          </button>
        </div>

        {/* Tab 1: All Updates (Main Feed) */}
        {activeTab === 'feed' && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <UpdateFilterBar
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              selectedImportance={selectedImportance}
              onSelectImportance={setSelectedImportance}
              onlyDeadlines={onlyDeadlines}
              onToggleOnlyDeadlines={setOnlyDeadlines}
              selectedInstitution={selectedInstitution}
              onSelectInstitution={setSelectedInstitution}
            />

            {/* Updates Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div
                    key={i}
                    className="h-64 rounded-2xl border border-border/40 bg-card/40 animate-pulse p-5"
                  />
                ))}
              </div>
            ) : updates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground bg-card/30">
                <Search className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                <h3 className="font-semibold text-foreground text-base">No updates matched your filters</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Try searching with different keywords, selecting "All Categories", or clearing the deadline toggle.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('ALL');
                    setSelectedInstitution('');
                    setOnlyDeadlines(false);
                    setSearchParams(prev => {
                      const next = new URLSearchParams(prev);
                      next.delete('search');
                      return next;
                    });
                  }}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {updates.map(update => (
                  <UpdateCard
                    key={update.id}
                    update={update}
                    onBookmarkToggle={handleBookmarkToggle}
                    onSetReminder={(u: StudentUpdate) => setReminderModalUpdate(u)}
                    onViewDetails={(u: StudentUpdate) => navigate(`/updates/${u.id}`)}
                    onFollowUniversity={handleToggleFollow}
                    isFollowingUniversity={isFollowing(update.institution)}
                    onOpenResultWatcher={handleOpenResultWatcher}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: For You (Personalized Feed & Subscriptions) */}
        {activeTab === 'personalized' && (
          <div className="space-y-6">
            {/* Subscriptions management header */}
            <div className="p-5 rounded-2xl border border-primary/20 bg-primary/5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Followed Universities & Exams</h3>
                    <p className="text-xs text-muted-foreground">
                      Personalized feed filtered specifically by your followed institutions.
                    </p>
                  </div>
                </div>
              </div>

              {/* Followed Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-primary/10">
                <span className="text-xs font-medium text-muted-foreground">Following:</span>
                {subscriptions.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">
                    None yet. Quick follow popular bodies:
                  </span>
                ) : (
                  subscriptions.map(sub => (
                    <span
                      key={sub.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-background border border-border text-foreground shadow-sm"
                    >
                      <Building2 className="w-3 h-3 text-primary" />
                      <span>{sub.target_value}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleFollow(sub.target_value)}
                        className="text-muted-foreground hover:text-rose-500 p-0.5"
                        title="Unfollow"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}

                {/* Quick Add Suggestions */}
                {['MGKVP', 'AKTU', 'University of Lucknow', 'BHU', 'SSC'].map(inst => {
                  const alreadyFollowed = subscriptions.some(s => s.target_value.toLowerCase().includes(inst.toLowerCase()));
                  if (alreadyFollowed) return null;
                  return (
                    <button
                      key={inst}
                      type="button"
                      onClick={() => handleToggleFollow(inst)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{inst}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {personalizedUpdates.map(update => (
                <UpdateCard
                  key={update.id}
                  update={update}
                  onBookmarkToggle={handleBookmarkToggle}
                  onSetReminder={(u: StudentUpdate) => setReminderModalUpdate(u)}
                  onViewDetails={(u: StudentUpdate) => navigate(`/updates/${u.id}`)}
                  onFollowUniversity={handleToggleFollow}
                  isFollowingUniversity={isFollowing(update.institution)}
                  onOpenResultWatcher={handleOpenResultWatcher}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Result Watchers (Phase 4 Feature) */}
        {activeTab === 'watchers' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Continuous Result Radar Tracking</h3>
                  <p className="text-xs text-muted-foreground">
                    Register your university, course, and roll number. Our crawlers check official gazettes 24/7 and alert you instantly upon declaration.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setResultWatcherDefaults({});
                  setIsResultWatcherModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Result Watcher</span>
              </button>
            </div>

            {resultWatchers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground bg-card/30">
                <GraduationCap className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                <h3 className="font-semibold text-foreground text-base">No active result watchers</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Never miss an official result gazette or marksheet release. Activate your first result watcher today.
                </p>
                <button
                  type="button"
                  onClick={() => setIsResultWatcherModalOpen(true)}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white"
                >
                  Activate Result Watcher
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resultWatchers.map(watcher => (
                  <div
                    key={watcher.id}
                    className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-4 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          {watcher.status === 'ACTIVE' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <Radio className="w-2.5 h-2.5 animate-pulse" />
                              Radar Scanning
                            </span>
                          )}
                          {watcher.status === 'RESULT_DECLARED' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              Result Declared
                            </span>
                          )}
                          {watcher.status === 'CANCELLED' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                              Cancelled
                            </span>
                          )}
                          {watcher.semester && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] bg-muted font-mono text-muted-foreground">
                              {watcher.semester}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-foreground text-sm">{watcher.course}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-muted-foreground" />
                          <span>{watcher.institution}</span>
                        </p>
                      </div>

                      {watcher.status === 'ACTIVE' && (
                        <button
                          type="button"
                          onClick={() => handleCancelWatcher(watcher.id)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Cancel Watcher"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {watcher.roll_number && (
                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 text-xs flex items-center justify-between">
                        <span className="text-muted-foreground">Tracked Roll No:</span>
                        <span className="font-mono font-bold text-foreground">{watcher.roll_number}</span>
                      </div>
                    )}

                    {watcher.status === 'RESULT_DECLARED' && watcher.result_url && (
                      <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-3">
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Official Gazette Live
                        </span>
                        <a
                          href={watcher.result_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
                        >
                          <span>View Scorecard / Gazette</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Deadlines Timeline */}
        {activeTab === 'deadlines' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-1 mb-8">
              <h2 className="text-lg font-bold text-foreground">Upcoming Academic Deadlines</h2>
              <p className="text-xs text-muted-foreground">
                Chronologically ordered submission cutoffs for exam forms, hall tickets, fee windows, and scholarships.
              </p>
            </div>
            <UpdateTimeline
              updates={updates}
              onSelectUpdate={(u: StudentUpdate) => navigate(`/updates/${u.id}`)}
            />
          </div>
        )}

        {/* Tab 5: Saved Bookmarks */}
        {activeTab === 'bookmarks' && (
          <div>
            {bookmarks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground bg-card/30">
                <Bookmark className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                <h3 className="font-semibold text-foreground text-base">No saved notices yet</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Click the bookmark icon on any notice card to save circulars for quick access later.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {bookmarks.map(bmk => (
                  <UpdateCard
                    key={bmk.id}
                    update={{ ...bmk.update, is_bookmarked: true }}
                    onBookmarkToggle={handleBookmarkToggle}
                    onSetReminder={(u: StudentUpdate) => setReminderModalUpdate(u)}
                    onViewDetails={(u: StudentUpdate) => navigate(`/updates/${u.id}`)}
                    onFollowUniversity={handleToggleFollow}
                    isFollowingUniversity={isFollowing(bmk.update.institution)}
                    onOpenResultWatcher={handleOpenResultWatcher}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Official Sources Transparency Grid */}
        {activeTab === 'sources' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl border border-border bg-card/40 space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Accredited Source Registry</h3>
              <p className="text-xs text-muted-foreground">
                LearningHub adheres to strict public transparency. Every notice links back to its verified statutory domain and official circular PDF.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sources.map(src => (
                <div
                  key={src.source_id}
                  className="rounded-2xl border border-border/70 bg-card p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-2">
                        <ShieldCheck className="w-3 h-3" />
                        Level {src.authority_level} Authority
                      </span>
                      <h4 className="font-bold text-foreground text-sm">{src.name}</h4>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">{src.domain}</p>
                    </div>
                    <a
                      href={src.base_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/40">
                    <div className="flex justify-between">
                      <span>Monitored Portals:</span>
                      <span className="font-semibold text-foreground">
                        {src.endpoints ? src.endpoints.length : 1}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Check Frequency:</span>
                      <span className="font-semibold text-foreground">
                        Every {src.polling_interval_minutes} mins
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Jurisdiction:</span>
                      <span className="font-semibold text-foreground">
                        {src.state}, {src.country}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reminder Modal */}
      <UpdateReminderModal
        isOpen={!!reminderModalUpdate}
        update={reminderModalUpdate}
        onClose={() => setReminderModalUpdate(null)}
        onConfirm={handleScheduleReminder}
      />

      {/* Result Watcher Modal */}
      <ResultWatcherModal
        isOpen={isResultWatcherModalOpen}
        onClose={() => setIsResultWatcherModalOpen(false)}
        onCreated={handleWatcherCreated}
        defaultInstitution={resultWatcherDefaults.institution}
        defaultCourse={resultWatcherDefaults.course}
      />

      {/* Notification Delivery Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={isPrefModalOpen}
        onClose={() => setIsPrefModalOpen(false)}
      />
    </div>
  );
};
