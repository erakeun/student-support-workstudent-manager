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
};

export type Schedule = {
  scheduleId: string;
  studentId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  semesterId: string;
  active: boolean;
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
};

export type Semester = {
  semesterId: string;
  semesterName: string;
  startDate: string;
  endDate: string;
  active: boolean;
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
};
