
export enum UserRole {
  SUPER_ADMIN = 'SuperAdmin', // Administrador do Sistema Inteiro (SaaS Owner)
  ADMIN = 'Admin',             // Administrador de uma Escola específica
  SECRETARIA = 'Secretaria',
  ENCARREGADO = 'Encarregado',
  PROFESSOR = 'Professor',
}

export type SchoolStatus = 'Ativo' | 'Em Divida' | 'Bloqueado' | 'Demonstração';

export interface SchoolSubscription {
    lastPaymentDate: string;
    monthlyFee: number;
    nextDueDate: string;
    paymentHistory: { date: string; amount: number; method: string; recordedBy: string }[];
}

export interface SchoolInstance {
    id: string;
    name: string;
    accessCode: string; // Novo campo para identificação da escola no login
    representativeName: string;
    email: string;
    contact: string;
    status: SchoolStatus;
    createdAt: string;
    subscription: SchoolSubscription;
}

export interface PasswordResetRequest {
    id: string;
    schoolId: string;
    schoolName: string;
    userEmail: string;
    userName: string;
    status: 'Pendente' | 'Resolvido';
    createdAt: string;
}

export interface User {
  id: string;
  schoolId?: string; // Vincula o usuário a uma escola específica (Vazio para SuperAdmin)
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  avatarUrl?: string;
  contact?: string;
  address?: string;
  birthDate?: string;
  category?: TeacherCategory;
  education?: string;
  specialization?: string;
  otherOccupations?: string;
  availability?: TeacherAvailability[];
}

// Re-exportando tipos existentes para manter compatibilidade
export type TeacherCategory = 'Efetivo' | 'Contratado' | 'Estagiário';
export type TeacherAvailability = 'Manhã' | 'Tarde' | 'Noite';
export type StudentStatus = 'Ativo' | 'Inativo' | 'Transferido' | 'Suspenso';
export interface StudentDocuments { photos: boolean; cedula: boolean; bi: boolean; drivingLicense: boolean; reportCard: boolean; transcript: boolean; transferNote: boolean; }
export interface Grade { subject: string; period: '1º Trimestre' | '2º Trimestre' | '3º Trimestre'; grade?: number; acs1?: number; acs2?: number; at?: number; academicYear: number; }
export interface ExamResult { subject: string; grade: number; academicYear: number; }
export interface AttendanceRecord { date: string; status: 'Presente' | 'Ausente' | 'Atrasado'; }
export interface BehaviorNote { date: string; note: string; type: 'Positivo' | 'Negativo'; severity?: 'Leve' | 'Moderada' | 'Grave'; measureTaken?: string; }
export interface BehaviorEvaluation { period: '1º Trimestre' | '2º Trimestre' | '3º Trimestre'; academicYear: number; scores: { assiduidade: number; disciplina: number; participacao: number; responsabilidade: number; socializacao: number; atitude: number; organizacao: number; }; percentage: number; }
export type AcademicYearStatus = 'Planeado' | 'Em Curso' | 'Concluído';
export interface Subject { id: string; name: string; }
export interface ClassLevelSubjects { classLevel: string; subjects: Subject[]; hasExam?: boolean; }
export interface AcademicYear { id: string; year: number; status: AcademicYearStatus; startMonth: number; endMonth: number; subjectsByClass?: ClassLevelSubjects[]; }
export type PaymentType = 'Matrícula' | 'Renovação' | 'Mensalidade' | 'Uniforme' | 'Material' | 'Taxa de Exames' | 'Taxa de Transferência' | 'Multa/Danos';
export type PaymentMethod = 'Numerário' | 'Transferência Bancária' | 'MPesa' | 'e-Mola' | 'mKesh' | 'POS';
export interface PaymentItem { item: string; value: number; }
export interface PaymentRecord { id: string; date: string; amount: number; type: PaymentType; method?: PaymentMethod; academicYear: number; referenceMonth?: number; description?: string; items?: PaymentItem[]; operatorName?: string; }
export interface ExtraCharge { id: string; description: string; amount: number; date: string; expenseId?: string; isPaid?: boolean; }
export type ExpenseCategory = 'Salários' | 'Água' | 'Energia' | 'Internet/Telecom' | 'Material didáctico' | 'Manutenção' | 'Transporte' | 'Marketing/Administração' | 'Outras despesas';
export interface ExpenseRecord { id: string; date: string; category: ExpenseCategory; amount: number; description: string; registeredBy: string; studentId?: string; isChargeable?: boolean; }
export type FinancialStatusType = 'Normal' | 'Isento Total' | 'Sem Multa' | 'Desconto Parcial';
export interface FinancialProfile { status: FinancialStatusType; discountPercentage?: number; affectedTypes?: PaymentType[]; justification?: string; }
export interface Student { id: string; name: string; gender: 'M' | 'F'; birthDate: string; profilePictureUrl?: string; fatherName: string; motherName: string; guardianName: string; guardianContact: string; guardianRelationship: string; address: string; healthInfo: string; desiredClass: string; isTransferred: boolean; previousSchool?: string; previousSchoolFinalGrade?: string; documents: StudentDocuments; matriculationDate: string; status: StudentStatus; suspensionDate?: string; grades?: Grade[]; examGrades?: ExamResult[]; attendance?: AttendanceRecord[]; behavior?: BehaviorNote[]; behaviorEvaluations?: BehaviorEvaluation[]; payments?: PaymentRecord[]; extraCharges?: ExtraCharge[]; financialProfile?: FinancialProfile; }
export interface UniformItem { id: string; name: string; price: number; }
export interface BookItem { id: string; title: string; classLevel: string; price: number; }
export interface ClassSpecificFee { classLevel: string; enrollmentFee: number; renewalFee: number; monthlyFee: number; }
export interface FinancialSettings { currency: string; enrollmentFee: number; renewalFee: number; monthlyFee: number; annualExamFee: number; transferFee: number; monthlyPaymentLimitDay: number; latePaymentPenaltyPercent: number; uniforms: UniformItem[]; books: BookItem[]; classSpecificFees?: ClassSpecificFee[]; enableMobilePayments?: boolean; mobilePaymentConfig?: { mpesaCode?: string; emolaCode?: string; mkeshCode?: string; }; }
export interface SchoolSettings { schoolName?: string; schoolLogo?: string; nuit?: string; address?: string; contact?: string; email?: string; totalClassrooms: number; studentsPerClass: number; shifts: number; evaluationWeights?: { p1: number; p2: number; }; examWeights?: { internal: number; exam: number; }; }
export type Shift = 'Manhã' | 'Tarde' | 'Noite';
export interface TeacherAssignment { teacherId: string; subjectIds: string[]; isSubstitute?: boolean; justification?: string; }
export interface Turma { id: string; name: string; academicYear: number; classLevel: string; shift: Shift; teachers: TeacherAssignment[]; studentIds: string[]; room?: string; }
export interface DiscussionMessage { id: string; topicId: string; userId: string; content: string; timestamp: string; replyToId?: string; }
export interface DiscussionTopic { id: string; title: string; createdBy: string; createdAt: string; participantIds: string[]; status: 'Open' | 'Closed'; }
export interface AppNotification { id: string; userId: string; type: 'message' | 'topic_invite' | 'admin_alert' | 'request_update'; title: string; message: string; read: boolean; timestamp: string; relatedId?: string; }
export type RequestStatus = 'Pendente' | 'Em Análise' | 'Aprovado' | 'Concluído' | 'Rejeitado';
export type RequestPriority = 'Baixa' | 'Normal' | 'Alta' | 'Urgente';
export interface SchoolRequest { id: string; requesterId: string; recipientId: string; type: string; title: string; description: string; status: RequestStatus; priority: RequestPriority; createdAt: string; updatedAt: string; feedback?: string; metadata?: any; }
