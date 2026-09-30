/**
 * Student Updates Hub Client Service.
 * Connects directly to /api/v1/updates with resilient offline fallbacks.
 */
import { fetchApi } from '../utils/api';
import type {
  StudentUpdate,
  UpdateBookmark,
  UpdateReminder,
  UpdateSubscription,
  UpdateSource,
  UpdatesStatistics,
  ResultWatcher,
  CreateResultWatcherPayload,
  UpdateNotificationPreference,
  FollowTargetPayload,
} from '../types/updates';

export const DEMO_STUDENT_UPDATES: StudentUpdate[] = [
  {
    id: 'upd-mgkvp-exam-bca-2026',
    title: 'MGKVP BCA / B.Sc / B.Com Even Semester Examination Form Submission Extended',
    summary:
      'The last date for submitting online examination forms for BCA, B.Sc, and B.Com 2nd, 4th, and 6th semester has been officially extended with standard late fee. Affiliated college principals must verify student roll numbers before final submission.',
    ai_summary:
      'Key takeaway: Online examination form window extended for even semester undergraduate students. Ensure roll number verification with your college department before the deadline.',
    is_ai_summarized: true,
    source_url: 'https://mgkvp.ac.in/Home/ExamNoticeBCA2026.pdf',
    category: 'EXAMINATION',
    sub_category: 'EXAM_FORM',
    institution: 'Mahatma Gandhi Kashi Vidyapith (MGKVP)',
    course: 'BCA',
    semester: '4th Semester',
    published_at: new Date(Date.now() - 86400000).toISOString(),
    deadline: new Date(Date.now() + 6 * 86400000).toISOString(),
    importance: 'URGENT',
    status: 'PUBLISHED',
    verification_status: 'VERIFIED',
    version: 1,
    source_name: 'Mahatma Gandhi Kashi Vidyapith Main Portal',
    source_domain: 'mgkvp.ac.in',
    authority_level: 1,
    attachments_count: 1,
    attachments: [
      {
        id: 'att-1',
        title: 'MGKVP_Notice_Exam_Form_Ext_2026.pdf',
        file_url: 'https://mgkvp.ac.in/Uploads/Notice_BCA_2026.pdf',
        file_size_bytes: 420000,
        mime_type: 'application/pdf',
      },
    ],
    cross_links: [
      {
        id: 'lnk-1',
        content_type: 'TEST',
        target_id: 'test-dsa-foundation',
        title: 'Take BCA / DSA Practice Assessment (Test A+)',
        action_cta: 'Start Assessment',
        action_url: '/tests/a',
      },
      {
        id: 'lnk-2',
        content_type: 'EBOOK',
        target_id: 'ebook-dbms-complete',
        title: 'Read Database Systems & SQL Interactive Notes',
        action_cta: 'Read Ebook',
        action_url: '/ebooks',
      },
    ],
    versions: [
      {
        id: 'ver-1',
        version_number: 1,
        title: 'MGKVP BCA / B.Sc / B.Com Even Semester Examination Form Submission Extended',
        summary:
          'The last date for submitting online examination forms for BCA, B.Sc, and B.Com 2nd, 4th, and 6th semester has been officially extended with standard late fee.',
        diff_summary: 'Initial publication from official authority feed.',
        changed_fields: ['initial_release'],
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
    is_bookmarked: false,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'upd-mgkvp-timetable-2026',
    title: 'MGKVP Main Campus & Affiliated Colleges Final Examination Time Table 2026 Announced',
    summary:
      'Mahatma Gandhi Kashi Vidyapith has released the comprehensive examination schedule for all undergraduate and postgraduate semester examinations commencing next month. Download the official subject-wise schedule below.',
    ai_summary:
      'Complete undergraduate and postgraduate semester timetable released. Morning and evening shifts scheduled across verified district centers.',
    is_ai_summarized: true,
    source_url: 'https://mgkvp.ac.in/Home/TimeTable2026.pdf',
    category: 'EXAMINATION',
    sub_category: 'TIMETABLE',
    institution: 'Mahatma Gandhi Kashi Vidyapith (MGKVP)',
    published_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
    importance: 'IMPORTANT',
    status: 'PUBLISHED',
    verification_status: 'VERIFIED',
    version: 1,
    source_name: 'Mahatma Gandhi Kashi Vidyapith Main Portal',
    source_domain: 'mgkvp.ac.in',
    authority_level: 1,
    attachments_count: 1,
    attachments: [
      {
        id: 'att-2',
        title: 'MGKVP_UG_PG_TimeTable_May2026.pdf',
        file_url: 'https://mgkvp.ac.in/Uploads/TimeTable2026.pdf',
        file_size_bytes: 840000,
        mime_type: 'application/pdf',
      },
    ],
    cross_links: [
      {
        id: 'lnk-3',
        content_type: 'STUDY_PLAN',
        target_id: 'plan-exam-target',
        title: 'Add Examination Schedule to Study Planner',
        action_cta: 'Sync to Planner',
        action_url: '/planner',
      },
    ],
    is_bookmarked: false,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'upd-aktu-cop-exam-2026',
    title: 'Dr. APJ Abdul Kalam Technical University Carry Over Exam Registration Window',
    summary:
      'All B.Tech, MCA, and MBA students appearing for carry over papers (COP) must complete subject choices and online fee deposit before the strict deadline. Late submissions will not be entertained.',
    ai_summary:
      'Mandatory registration for COP exams. Technical university students must verify internal marks and clear pending semester dues.',
    is_ai_summarized: true,
    source_url: 'https://aktu.ac.in/circulars/cop_exam_reg_2026.pdf',
    category: 'EXAMINATION',
    sub_category: 'EXAM_FORM',
    institution: 'AKTU Lucknow',
    course: 'B.Tech',
    published_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    deadline: new Date(Date.now() + 4 * 86400000).toISOString(),
    importance: 'URGENT',
    status: 'PUBLISHED',
    verification_status: 'VERIFIED',
    version: 1,
    source_name: 'Dr. A.P.J. Abdul Kalam Technical University',
    source_domain: 'aktu.ac.in',
    authority_level: 1,
    attachments_count: 1,
    attachments: [
      {
        id: 'att-3',
        title: 'AKTU_COP_Circular_2026.pdf',
        file_url: 'https://aktu.ac.in/circulars/cop_exam_reg_2026.pdf',
        file_size_bytes: 310000,
        mime_type: 'application/pdf',
      },
    ],
    is_bookmarked: false,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'upd-ssc-cgl-notification-2026',
    title: 'Staff Selection Commission Combined Graduate Level (SSC CGL) Notification Released',
    summary:
      'SSC invites online applications for recruitment to Group B and Group C posts in various Ministries and Departments of the Government of India. Tier-1 Computer Based Examination is scheduled for July-August.',
    ai_summary:
      'Official national recruitment drive announced. Graduates across India eligible to apply for assistant audit officer, tax assistant, and inspector cadres.',
    is_ai_summarized: true,
    source_url: 'https://ssc.gov.in/notice/cgl2026',
    category: 'COMPETITIVE_EXAMS',
    sub_category: 'ADMISSION_OPEN',
    institution: 'Staff Selection Commission',
    published_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    deadline: new Date(Date.now() + 25 * 86400000).toISOString(),
    importance: 'URGENT',
    status: 'PUBLISHED',
    verification_status: 'VERIFIED',
    version: 1,
    source_name: 'Staff Selection Commission Official',
    source_domain: 'ssc.gov.in',
    authority_level: 1,
    attachments_count: 1,
    cross_links: [
      {
        id: 'lnk-4',
        content_type: 'TEST',
        target_id: 'test-ssc-quantitative',
        title: 'Attempt SSC CGL Tier 1 Mock Assessment',
        action_cta: 'Start Mock Test',
        action_url: '/tests/a',
      },
    ],
    is_bookmarked: false,
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: 'upd-up-scholarship-aadhaar-2026',
    title: 'Uttar Pradesh State Post-Matric Scholarship Biometric Attendance & Aadhaar Seeding Notice',
    summary:
      'All students availing UP Social Welfare Department scholarship must ensure 75% biometric attendance and link Aadhaar with bank accounts before the university verification freeze date.',
    ai_summary:
      'Mandatory Aadhaar-NPCI bank linking and 75% biometric attendance required to avoid scholarship application rejection.',
    is_ai_summarized: true,
    source_url: 'https://mgkvp.ac.in/Home/ScholarshipAadhaar2026.pdf',
    category: 'SCHOLARSHIP',
    sub_category: 'SCHOLARSHIP_OPEN',
    institution: 'Mahatma Gandhi Kashi Vidyapith (MGKVP)',
    published_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
    importance: 'NORMAL',
    status: 'PUBLISHED',
    verification_status: 'VERIFIED',
    version: 1,
    source_name: 'Mahatma Gandhi Kashi Vidyapith Main Portal',
    source_domain: 'mgkvp.ac.in',
    authority_level: 1,
    attachments_count: 1,
    is_bookmarked: false,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'upd-lu-exam-schedule-2026',
    title: 'University of Lucknow Even Semester B.Tech / MBA / B.Com Examination Schedule 2026',
    summary:
      'University of Lucknow (LU) has notified the complete datesheet for Even Semester undergraduate and postgraduate examinations. Download the center-wise schedule and guidelines.',
    ai_summary:
      'Official datesheet published for B.Tech, MBA, and B.Com even semesters. Morning (8:00 AM - 11:00 AM) and Afternoon (2:00 PM - 5:00 PM) shifts.',
    is_ai_summarized: true,
    source_url: 'https://lkouniv.ac.in/en/article/examination-schedule-2026',
    category: 'EXAMINATION',
    sub_category: 'TIMETABLE',
    institution: 'University of Lucknow',
    course: 'B.Tech',
    semester: '4th Semester',
    published_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    deadline: new Date(Date.now() + 12 * 86400000).toISOString(),
    importance: 'IMPORTANT',
    status: 'PUBLISHED',
    verification_status: 'VERIFIED',
    version: 1,
    source_name: 'University of Lucknow Official Portal',
    source_domain: 'lkouniv.ac.in',
    authority_level: 1,
    attachments_count: 1,
    attachments: [
      {
        id: 'att-lu-1',
        title: 'LU_Even_Semester_Datesheet_2026.pdf',
        file_url: 'https://lkouniv.ac.in/Uploads/Datesheet_2026.pdf',
        file_size_bytes: 580000,
        mime_type: 'application/pdf',
      },
    ],
    is_bookmarked: false,
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: 'upd-bhu-cuet-counselling-2026',
    title: 'Banaras Hindu University (BHU) CUET UG 2026 Counseling Registration Window Open',
    summary:
      'BHU Central Admission Committee opens candidate preference filling and counseling registration portal for undergraduate courses across Arts, Science, and Commerce faculties.',
    ai_summary:
      'CUET UG candidates can now register for BHU counseling and enter course/combination preferences before the first cutoff declaration.',
    is_ai_summarized: true,
    source_url: 'https://bhu.ac.in/admissions/cuet-ug-2026',
    category: 'ADMISSION',
    sub_category: 'COUNSELLING',
    institution: 'Banaras Hindu University (BHU)',
    published_at: new Date(Date.now() - 36 * 3600000).toISOString(),
    deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
    importance: 'URGENT',
    status: 'PUBLISHED',
    verification_status: 'VERIFIED',
    version: 1,
    source_name: 'Banaras Hindu University Official Portal',
    source_domain: 'bhu.ac.in',
    authority_level: 1,
    attachments_count: 1,
    attachments: [
      {
        id: 'att-bhu-1',
        title: 'BHU_CUET_Counselling_Guidelines_2026.pdf',
        file_url: 'https://bhu.ac.in/docs/cuet_guidelines_2026.pdf',
        file_size_bytes: 490000,
        mime_type: 'application/pdf',
      },
    ],
    is_bookmarked: false,
    created_at: new Date(Date.now() - 36 * 3600000).toISOString(),
  },
  {
    id: 'upd-ddu-backpaper-form-2026',
    title: 'DDU Gorakhpur University Annual / Semester Back Paper & Improvement Exam Forms',
    summary:
      'Deen Dayal Upadhyaya Gorakhpur University extends the online portal for submission of back paper and improvement examination forms for UG regular and private candidates.',
    ai_summary:
      'Eligible UG students can submit Back Paper / Improvement forms online with normal fee until the deadline.',
    is_ai_summarized: true,
    source_url: 'https://ddugu.ac.in/notices/back-paper-2026',
    category: 'EXAMINATION',
    sub_category: 'BACK_PAPER',
    institution: 'DDU Gorakhpur University',
    published_at: new Date(Date.now() - 48 * 3600000).toISOString(),
    deadline: new Date(Date.now() + 5 * 86400000).toISOString(),
    importance: 'IMPORTANT',
    status: 'PUBLISHED',
    verification_status: 'VERIFIED',
    version: 1,
    source_name: 'Deen Dayal Upadhyaya Gorakhpur University',
    source_domain: 'ddugu.ac.in',
    authority_level: 1,
    attachments_count: 1,
    attachments: [
      {
        id: 'att-ddu-1',
        title: 'DDU_BackPaper_Notification_2026.pdf',
        file_url: 'https://ddugu.ac.in/docs/backpaper_notice_2026.pdf',
        file_size_bytes: 340000,
        mime_type: 'application/pdf',
      },
    ],
    is_bookmarked: false,
    created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
  {
    id: 'upd-nta-cuet-ug-city-intimation-2026',
    title: 'NTA CUET (UG) 2026 Advance Intimation of Examination City Slip Released',
    summary:
      'National Testing Agency releases advance intimation of examination city for registered candidates of Common University Entrance Test CUET (UG) 2026 across India and abroad.',
    ai_summary:
      'City intimation slip informs candidate about exam city allocated. Admit cards with roll number and venue will follow.',
    is_ai_summarized: true,
    source_url: 'https://nta.ac.in/public-notices/cuet-ug-city-slip-2026',
    category: 'COMPETITIVE_EXAMS',
    sub_category: 'EXAM_CENTER',
    institution: 'National Testing Agency (NTA)',
    published_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    deadline: new Date(Date.now() + 8 * 86400000).toISOString(),
    importance: 'URGENT',
    status: 'PUBLISHED',
    verification_status: 'VERIFIED',
    version: 1,
    source_name: 'National Testing Agency Official Portal',
    source_domain: 'nta.ac.in',
    authority_level: 1,
    attachments_count: 1,
    attachments: [
      {
        id: 'att-nta-1',
        title: 'NTA_Public_Notice_CUET_UG_City_Slip_2026.pdf',
        file_url: 'https://nta.ac.in/docs/public_notice_cuet_city_2026.pdf',
        file_size_bytes: 410000,
        mime_type: 'application/pdf',
      },
    ],
    cross_links: [
      {
        id: 'lnk-nta-1',
        content_type: 'TEST',
        target_id: 'test-cuet-domain',
        title: 'Take CUET UG Mock Test (Domain Subjects)',
        action_cta: 'Start CUET Mock',
        action_url: '/tests/a',
      },
    ],
    is_bookmarked: false,
    created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
];

export const DEMO_RESULT_WATCHERS: ResultWatcher[] = [
  {
    id: 'watch-mgkvp-bca',
    institution: 'Mahatma Gandhi Kashi Vidyapith (MGKVP)',
    course: 'BCA',
    semester: '4th Semester',
    roll_number: '2300582910',
    status: 'ACTIVE',
    result_url: '',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'watch-aktu-btech',
    institution: 'AKTU Lucknow',
    course: 'B.Tech',
    semester: '6th Semester',
    roll_number: '220133010045',
    status: 'RESULT_DECLARED',
    result_url: 'https://aktu.ac.in/results/btech-sem6-2026.html',
    notified_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
];

export const DEMO_SOURCES: UpdateSource[] = [
  {
    source_id: 'src-mgkvp-official',
    name: 'Mahatma Gandhi Kashi Vidyapith Main Portal',
    domain: 'mgkvp.ac.in',
    source_type: 'UNIVERSITY',
    authority_level: 1,
    category: 'ACADEMIC',
    country: 'India',
    state: 'Uttar Pradesh',
    institution: 'Mahatma Gandhi Kashi Vidyapith (MGKVP)',
    base_url: 'https://mgkvp.ac.in',
    polling_interval_minutes: 30,
    is_enabled: true,
    endpoints: [
      { id: 'ep-1', name: 'General Notice Board', sub_category: 'NOTICE_BOARD', endpoint_url: 'https://mgkvp.ac.in/Home/NoticeList', is_active: true },
      { id: 'ep-2', name: 'Examination & Forms', sub_category: 'EXAMINATION', endpoint_url: 'https://mgkvp.ac.in/Home/ExamNotices', is_active: true },
      { id: 'ep-3', name: 'Time Table & Centers', sub_category: 'TIMETABLE', endpoint_url: 'https://mgkvp.ac.in/Home/TimeTable', is_active: true },
      { id: 'ep-4', name: 'Evaluation & Results', sub_category: 'RESULTS', endpoint_url: 'https://mgkvp.ac.in/Home/Results', is_active: true },
    ],
  },
  {
    source_id: 'src-aktu-official',
    name: 'Dr. A.P.J. Abdul Kalam Technical University',
    domain: 'aktu.ac.in',
    source_type: 'UNIVERSITY',
    authority_level: 1,
    category: 'ACADEMIC',
    country: 'India',
    state: 'Uttar Pradesh',
    institution: 'AKTU Lucknow',
    base_url: 'https://aktu.ac.in',
    polling_interval_minutes: 60,
    is_enabled: true,
    endpoints: [
      { id: 'ep-5', name: 'Circulars & Notices', sub_category: 'EXAMINATION', endpoint_url: 'https://aktu.ac.in/circulars.html', is_active: true },
    ],
  },
  {
    source_id: 'src-lu-official',
    name: 'University of Lucknow Official Portal',
    domain: 'lkouniv.ac.in',
    source_type: 'UNIVERSITY',
    authority_level: 1,
    category: 'ACADEMIC',
    country: 'India',
    state: 'Uttar Pradesh',
    institution: 'University of Lucknow',
    base_url: 'https://lkouniv.ac.in',
    polling_interval_minutes: 30,
    is_enabled: true,
    endpoints: [
      { id: 'ep-lu-1', name: 'Notices and Circulars', sub_category: 'NOTICE_BOARD', endpoint_url: 'https://lkouniv.ac.in/en/article/notices-and-circulars', is_active: true },
      { id: 'ep-lu-2', name: 'Examination Schedules', sub_category: 'EXAMINATION', endpoint_url: 'https://lkouniv.ac.in/en/article/examination-schedule', is_active: true },
    ],
  },
  {
    source_id: 'src-bhu-official',
    name: 'Banaras Hindu University Official Portal',
    domain: 'bhu.ac.in',
    source_type: 'UNIVERSITY',
    authority_level: 1,
    category: 'ACADEMIC',
    country: 'India',
    state: 'Uttar Pradesh',
    institution: 'Banaras Hindu University (BHU)',
    base_url: 'https://bhu.ac.in',
    polling_interval_minutes: 30,
    is_enabled: true,
    endpoints: [
      { id: 'ep-bhu-1', name: 'Student Portal & Notices', sub_category: 'NOTICE_BOARD', endpoint_url: 'https://bhu.ac.in/Site/NoticeBoard', is_active: true },
    ],
  },
  {
    source_id: 'src-ddu-official',
    name: 'Deen Dayal Upadhyaya Gorakhpur University',
    domain: 'ddugu.ac.in',
    source_type: 'UNIVERSITY',
    authority_level: 1,
    category: 'ACADEMIC',
    country: 'India',
    state: 'Uttar Pradesh',
    institution: 'DDU Gorakhpur University',
    base_url: 'https://ddugu.ac.in',
    polling_interval_minutes: 45,
    is_enabled: true,
    endpoints: [
      { id: 'ep-ddu-1', name: 'General & Exam Notices', sub_category: 'NOTICE_BOARD', endpoint_url: 'https://ddugu.ac.in/notice.aspx', is_active: true },
    ],
  },
  {
    source_id: 'src-ssc-gov',
    name: 'Staff Selection Commission Official',
    domain: 'ssc.gov.in',
    source_type: 'EXAM_BOARD',
    authority_level: 1,
    category: 'COMPETITIVE_EXAMS',
    country: 'India',
    state: 'National',
    institution: 'Staff Selection Commission',
    base_url: 'https://ssc.gov.in',
    polling_interval_minutes: 120,
    is_enabled: true,
    endpoints: [
      { id: 'ep-6', name: 'Notice Board', sub_category: 'NOTICE_BOARD', endpoint_url: 'https://ssc.gov.in', is_active: true },
    ],
  },
  {
    source_id: 'src-nta-official',
    name: 'National Testing Agency Official Portal',
    domain: 'nta.ac.in',
    source_type: 'EXAM_BOARD',
    authority_level: 1,
    category: 'COMPETITIVE_EXAMS',
    country: 'India',
    state: 'National',
    institution: 'National Testing Agency',
    base_url: 'https://nta.ac.in',
    polling_interval_minutes: 30,
    is_enabled: true,
    endpoints: [
      { id: 'ep-nta-1', name: 'Public Notices', sub_category: 'NOTICE_BOARD', endpoint_url: 'https://nta.ac.in/NoticeArchive', is_active: true },
    ],
  },
];

export const updatesService = {
  async getUpdates(filters?: {
    category?: string;
    search?: string;
    institution?: string;
    importance?: string;
    course?: string;
    onlyDeadlines?: boolean;
  }): Promise<StudentUpdate[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.category && filters.category !== 'ALL') params.append('category', filters.category);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.institution) params.append('institution', filters.institution);
      if (filters?.importance) params.append('importance', filters.importance);
      if (filters?.course) params.append('course', filters.course);
      if (filters?.onlyDeadlines) params.append('only_deadlines', 'true');

      const url = `/api/v1/updates/feed/${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetchApi(url);
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch {
      // Fallback to local demo updates
    }

    // Filter local demo records
    return DEMO_STUDENT_UPDATES.filter(u => {
      if (filters?.category && filters.category !== 'ALL' && u.category !== filters.category) return false;
      if (filters?.importance && filters.importance !== 'ALL' && u.importance !== filters.importance) return false;
      if (filters?.onlyDeadlines && !u.deadline) return false;
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        return (
          u.title.toLowerCase().includes(q) ||
          u.summary.toLowerCase().includes(q) ||
          u.institution.toLowerCase().includes(q)
        );
      }
      return true;
    });
  },

  async getPersonalizedFeed(): Promise<StudentUpdate[]> {
    try {
      const res = await fetchApi('/api/v1/updates/personalized/');
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch {
      // Fallback
    }
    return DEMO_STUDENT_UPDATES.slice(0, 4);
  },

  async getUpcomingDeadlines(): Promise<StudentUpdate[]> {
    try {
      const res = await fetchApi('/api/v1/updates/deadlines/');
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch {
      // Fallback
    }
    return DEMO_STUDENT_UPDATES.filter(u => !!u.deadline).sort((a, b) =>
      new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()
    );
  },

  async getUpdateById(id: string): Promise<StudentUpdate | null> {
    try {
      const res = await fetchApi(`/api/v1/updates/${id}/`);
      if (res?.data) {
        return res.data;
      }
    } catch {
      // Fallback
    }
    return DEMO_STUDENT_UPDATES.find(u => u.id === id) || null;
  },

  async getBookmarks(): Promise<UpdateBookmark[]> {
    try {
      const res = await fetchApi('/api/v1/updates/bookmarks/');
      if (res?.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch {
      // Fallback
    }
    return [];
  },

  async saveBookmark(updateId: string, notes = '', tag = 'General'): Promise<UpdateBookmark | null> {
    try {
      const res = await fetchApi('/api/v1/updates/bookmarks/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ update_id: updateId, notes, tag }),
      });
      return res?.data || null;
    } catch {
      const update = DEMO_STUDENT_UPDATES.find(u => u.id === updateId);
      if (update) {
        update.is_bookmarked = true;
        return {
          id: `bmk-local-${Date.now()}`,
          update,
          notes,
          tag,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      return null;
    }
  },

  async removeBookmark(updateId: string): Promise<boolean> {
    try {
      await fetchApi(`/api/v1/updates/bookmarks/${updateId}/`, {
        method: 'DELETE',
      });
      return true;
    } catch {
      const update = DEMO_STUDENT_UPDATES.find(u => u.id === updateId);
      if (update) update.is_bookmarked = false;
      return true;
    }
  },

  async getReminders(): Promise<UpdateReminder[]> {
    try {
      const res = await fetchApi('/api/v1/updates/reminders/');
      if (res?.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch {
      // Fallback
    }
    return [];
  },

  async createReminder(updateId: string, reminderType = '1_DAY_BEFORE'): Promise<UpdateReminder | null> {
    try {
      const res = await fetchApi('/api/v1/updates/reminders/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ update_id: updateId, reminder_type: reminderType }),
      });
      return res?.data || null;
    } catch {
      const update = DEMO_STUDENT_UPDATES.find(u => u.id === updateId);
      if (update) {
        return {
          id: `rem-local-${Date.now()}`,
          update,
          reminder_type: reminderType as any,
          trigger_at: new Date(Date.now() + 86400000).toISOString(),
          is_dispatched: false,
          created_at: new Date().toISOString(),
        };
      }
      return null;
    }
  },

  async cancelReminder(reminderId: string): Promise<boolean> {
    try {
      await fetchApi(`/api/v1/updates/reminders/${reminderId}/`, {
        method: 'DELETE',
      });
      return true;
    } catch {
      return true;
    }
  },

  async getSubscriptions(): Promise<UpdateSubscription[]> {
    try {
      const res = await fetchApi('/api/v1/updates/subscriptions/');
      if (res?.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch {
      // Fallback
    }
    return [];
  },

  async subscribeTarget(targetType: string, targetValue: string): Promise<UpdateSubscription | null> {
    try {
      const res = await fetchApi('/api/v1/updates/subscriptions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_type: targetType, target_value: targetValue }),
      });
      return res?.data || null;
    } catch {
      return {
        id: `sub-local-${Date.now()}`,
        target_type: targetType as any,
        target_value: targetValue,
        created_at: new Date().toISOString(),
      };
    }
  },

  async unsubscribeTarget(subscriptionId: string): Promise<boolean> {
    try {
      await fetchApi(`/api/v1/updates/subscriptions/${subscriptionId}/`, {
        method: 'DELETE',
      });
      return true;
    } catch {
      return true;
    }
  },

  async getSources(): Promise<UpdateSource[]> {
    try {
      const res = await fetchApi('/api/v1/updates/sources/');
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch {
      // Fallback
    }
    return DEMO_SOURCES;
  },

  async getStats(): Promise<UpdatesStatistics> {
    try {
      const res = await fetchApi('/api/v1/updates/stats/');
      if (res?.data) {
        return res.data;
      }
    } catch {
      // Fallback
    }
    return {
      total_updates: DEMO_STUDENT_UPDATES.length,
      urgent_updates: DEMO_STUDENT_UPDATES.filter(u => u.importance === 'URGENT').length,
      active_deadlines: DEMO_STUDENT_UPDATES.filter(u => !!u.deadline).length,
      tracked_sources: DEMO_SOURCES.length,
    };
  },

  async seedInitialData(): Promise<any> {
    try {
      return await fetchApi('/api/v1/updates/seed/', { method: 'POST' });
    } catch (e) {
      return { success: false, error: e };
    }
  },

  async getResultWatchers(): Promise<ResultWatcher[]> {
    try {
      const res = await fetchApi('/api/v1/updates/result-watchers/');
      if (res?.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch {
      // Fallback
    }
    return DEMO_RESULT_WATCHERS;
  },

  async createResultWatcher(payload: {
    institution: string;
    course: string;
    semester?: string;
    roll_number?: string;
  }): Promise<ResultWatcher | null> {
    try {
      const res = await fetchApi('/api/v1/updates/result-watchers/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res?.data || null;
    } catch {
      const newWatcher: ResultWatcher = {
        id: `watch-local-${Date.now()}`,
        institution: payload.institution,
        course: payload.course,
        semester: payload.semester || '',
        roll_number: payload.roll_number || '',
        status: 'ACTIVE',
        result_url: '',
        created_at: new Date().toISOString(),
      };
      DEMO_RESULT_WATCHERS.unshift(newWatcher);
      return newWatcher;
    }
  },

  async cancelResultWatcher(watcherId: string): Promise<boolean> {
    try {
      await fetchApi(`/api/v1/updates/result-watchers/${watcherId}/`, {
        method: 'DELETE',
      });
      return true;
    } catch {
      const idx = DEMO_RESULT_WATCHERS.findIndex(w => w.id === watcherId);
      if (idx !== -1) {
        DEMO_RESULT_WATCHERS[idx].status = 'CANCELLED';
      }
      return true;
    }
  },

  async autoScheduleDeadlineReminders(updateId: string): Promise<UpdateReminder[]> {
    try {
      const res = await fetchApi(`/api/v1/updates/${updateId}/auto-remind/`, {
        method: 'POST',
      });
      if (res?.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch {
      const update = DEMO_STUDENT_UPDATES.find(u => u.id === updateId);
      if (update) {
        return [
          {
            id: `rem-auto-1-${Date.now()}`,
            update,
            reminder_type: '7_DAYS_BEFORE',
            trigger_at: new Date(Date.now() + 7 * 86400000).toISOString(),
            is_dispatched: false,
            created_at: new Date().toISOString(),
          },
          {
            id: `rem-auto-2-${Date.now()}`,
            update,
            reminder_type: '3_DAYS_BEFORE',
            trigger_at: new Date(Date.now() + 3 * 86400000).toISOString(),
            is_dispatched: false,
            created_at: new Date().toISOString(),
          },
          {
            id: `rem-auto-3-${Date.now()}`,
            update,
            reminder_type: '1_DAY_BEFORE',
            trigger_at: new Date(Date.now() + 1 * 86400000).toISOString(),
            is_dispatched: false,
            created_at: new Date().toISOString(),
          },
          {
            id: `rem-auto-4-${Date.now()}`,
            update,
            reminder_type: 'DAY_OF',
            trigger_at: new Date().toISOString(),
            is_dispatched: false,
            created_at: new Date().toISOString(),
          },
        ];
      }
    }
    return [];
  },

  async getNotificationPreferences(): Promise<UpdateNotificationPreference | null> {
    try {
      const res = await fetchApi('/api/v1/updates/preferences/');
      return res?.data || null;
    } catch {
      return {
        quiet_hours_enabled: true,
        quiet_hours_start: '22:00:00',
        quiet_hours_end: '07:00:00',
        max_daily_push: 8,
        subscribed_categories: ['ALL'],
      };
    }
  },

  async updateNotificationPreferences(
    prefs: Partial<UpdateNotificationPreference>
  ): Promise<UpdateNotificationPreference | null> {
    try {
      const res = await fetchApi('/api/v1/updates/preferences/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      return res?.data || null;
    } catch {
      return {
        quiet_hours_enabled: prefs.quiet_hours_enabled ?? true,
        quiet_hours_start: prefs.quiet_hours_start ?? '22:00:00',
        quiet_hours_end: prefs.quiet_hours_end ?? '07:00:00',
        max_daily_push: prefs.max_daily_push ?? 8,
        subscribed_categories: prefs.subscribed_categories ?? ['ALL'],
      };
    }
  },

  async bookmarkUpdate(updateId: string, notes = '', tag = 'General'): Promise<UpdateBookmark | null> {
    return this.saveBookmark(updateId, notes, tag);
  },

  async setReminder(updateId: string, reminderType: any = '1_DAY_BEFORE'): Promise<UpdateReminder | null> {
    const rType = Array.isArray(reminderType) ? reminderType[0] : reminderType;
    return this.createReminder(updateId, rType);
  },
};
