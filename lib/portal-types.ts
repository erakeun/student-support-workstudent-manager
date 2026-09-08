export type Part = {
  partId: string;
  partName: string;
  displayOrder: number;
  color: string;
  active: boolean;
  defaultHourlyWage?: number | string;
  note?: string;
};

export type Student = {
  studentId: string;
  name: string;
  studentNumber: string;
  partId: string;
  workerType: 'NATIONAL_WORK' | 'INTERNAL_WORK' | 'SHORT_TERM' | 'OTHER';
  startDate: string;
  endDate: string;
  taskSummary: string;
  workMemo: string;
  contactMemo: string;
  specialNote: string;
  substituteTasks: string;
  active: boolean;
  loginId?: string;
  role?: 'STUDENT' | 'ADMIN' | 'STAFF';
  hasPassword?: boolean;
  lastPasswordChangedAt?: string;
  email?: string;
  phone?: string;
  hourlyWage?: number | string;
};

export type Schedule = {
  scheduleId: string;
  studentId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  semesterId: string;
  active: boolean;
  updatedAt?: string;
  updatedBy?: string;
  date?: string;
};

export type WorkTask = {
  taskId: string;
  taskName: string;
  description: string;
  partId: string;
  studentId: string;
  employeeId: string;
  keywords: string;
  active: boolean;
  updatedAt?: string;
  updatedBy?: string;
};

export type Employee = {
  employeeId: string;
  name: string;
  partId: string;
  extension: string;
  tasks: string;
  active: boolean;
};

export type WorkLog = {
  logId: string;
  studentId: string;
  date: string;
  clockIn: string;
  clockOut: string;
  minutes: number;
  status: string;
  note: string;
  scheduleId?: string;
  partId?: string;
  reason?: string;
  editedBy?: string;
  editedAt?: string;
  createdBy?: string;
  createdAt?: string;
  flagCode?: string;
};

export type Semester = {
  semesterId: string;
  semesterName: string;
  startDate: string;
  endDate: string;
  active: boolean;
  createdAt?: string;
  createdBy?: string;
};

export type Substitution = {
  substitutionId: string;
  scheduleId: string;
  date: string;
  requesterStudentId: string;
  substituteStudentId: string;
  partId: string;
  status: 'OPEN' | 'APPLIED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reason: string;
  createdAt: string;
  updatedAt: string;
  approvedBy: string;
};

export type Budget = {
  month: string;
  totalBudget: number | string;
  nationalBudget: number | string;
  internalBudget: number | string;
  shortTermBudget: number | string;
  /** V4 이전 소속별 예산 열. 기존 시트 호환을 위해 읽기만 유지한다. */
  supportBudget?: number | string;
  reserveBudget?: number | string;
  note: string;
  updatedAt?: string;
  updatedBy?: string;
};

export type Handover = {
  handoverId: string;
  date: string;
  partId: string;
  authorStudentId: string;
  title: string;
  content: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
  priority: 'NORMAL' | 'IMPORTANT';
  targetStudentId?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  visibility?: 'PUBLIC' | 'PART';
  pinned?: boolean;
  acknowledgedBy?: string;
  active?: boolean;
};

export type SessionUser = {
  role: 'STUDENT' | 'ADMIN' | 'STAFF';
  name: string;
  email?: string;
  adminId?: string;
  loginId?: string;
  studentId?: string;
  partId?: string;
};

export type PortalData = {
  parts: Part[];
  students: Student[];
  schedules: Schedule[];
  tasks: WorkTask[];
  employees: Employee[];
  workLogs: WorkLog[];
  semesters: Semester[];
  settings: Record<string, string>;
  substitutions?: Substitution[];
  budgets?: Budget[];
  handovers?: Handover[];
  substitutionCandidates?: Array<
    Pick<Student, 'studentId' | 'name' | 'partId'>
  >;
  currentUser?: SessionUser;
};
