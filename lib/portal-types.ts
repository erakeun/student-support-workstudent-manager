export type Part = {
  partId: string;
  partName: string;
  displayOrder: number;
  color: string;
  active: boolean;
};

export type Student = {
  studentId: string;
  name: string;
  studentNumber: string;
  partId: string;
  workerType: 'NATIONAL_WORK' | 'SHORT_TERM' | 'OTHER';
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

export type SessionUser = {
  role: 'STUDENT' | 'ADMIN' | 'STAFF';
  name: string;
  email?: string;
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
  substitutionCandidates?: Array<
    Pick<Student, 'studentId' | 'name' | 'partId'>
  >;
  currentUser?: SessionUser;
};
