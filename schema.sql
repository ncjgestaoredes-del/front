
-- SQL Schema SEI Smart v2.6 - Corrigido para Sincronização Total

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Escolas
CREATE TABLE IF NOT EXISTS schools (
    id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    accessCode VARCHAR(100) UNIQUE NOT NULL,
    representativeName VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    contact VARCHAR(50),
    status ENUM('Ativo', 'Em Divida', 'Bloqueado', 'Demonstração') DEFAULT 'Ativo',
    subscription JSON,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Usuários (Adicionado campos de Professor)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci PRIMARY KEY,
    schoolId VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('SuperAdmin', 'Admin', 'Secretaria', 'Encarregado', 'Professor') NOT NULL,
    avatarUrl TEXT,
    contact VARCHAR(50),
    address TEXT,
    birthDate DATE,
    category VARCHAR(50),
    education VARCHAR(255),
    specialization VARCHAR(255),
    otherOccupations TEXT,
    availability JSON,
    INDEX (schoolId),
    CONSTRAINT fk_user_school FOREIGN KEY (schoolId) REFERENCES schools(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Estudantes (Adicionado colunas de transferência e pagamentos em JSON para compatibilidade total)
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci PRIMARY KEY,
    schoolId VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    name VARCHAR(255) NOT NULL,
    gender ENUM('M', 'F') NOT NULL,
    birthDate DATE NOT NULL,
    profilePictureUrl LONGTEXT,
    fatherName VARCHAR(255),
    motherName VARCHAR(255),
    guardianName VARCHAR(255),
    guardianContact VARCHAR(50),
    guardianRelationship VARCHAR(100),
    address TEXT,
    healthInfo TEXT,
    desiredClass VARCHAR(50),
    status ENUM('Ativo', 'Inativo', 'Transferido', 'Suspenso') DEFAULT 'Ativo',
    matriculationDate DATE,
    suspensionDate DATE,
    isTransferred BOOLEAN DEFAULT FALSE,
    previousSchool VARCHAR(255),
    previousSchoolFinalGrade VARCHAR(50),
    financialProfile JSON,
    documents JSON,
    grades JSON,
    examGrades JSON,
    attendance JSON,
    behavior JSON,
    payments JSON, -- Agora os pagamentos ficam dentro do aluno para simplificar a persistência do objeto Frontend
    extraCharges JSON,
    INDEX (schoolId),
    CONSTRAINT fk_student_school FOREIGN KEY (schoolId) REFERENCES schools(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Turmas
CREATE TABLE IF NOT EXISTS turmas (
    id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci PRIMARY KEY,
    schoolId VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    name VARCHAR(100) NOT NULL,
    academicYear INT NOT NULL,
    classLevel VARCHAR(50) NOT NULL,
    shift ENUM('Manhã', 'Tarde', 'Noite') NOT NULL,
    room VARCHAR(50),
    teachers JSON,
    studentIds JSON,
    INDEX (schoolId),
    CONSTRAINT fk_turma_school FOREIGN KEY (schoolId) REFERENCES schools(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Anos Académicos
CREATE TABLE IF NOT EXISTS academic_years (
    id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci PRIMARY KEY,
    schoolId VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    year INT NOT NULL,
    status ENUM('Planeado', 'Em Curso', 'Concluído') DEFAULT 'Planeado',
    startMonth INT DEFAULT 2,
    endMonth INT DEFAULT 11,
    subjectsByClass JSON,
    INDEX (schoolId),
    CONSTRAINT fk_ay_school FOREIGN KEY (schoolId) REFERENCES schools(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Despesas (Adicionado isChargeable)
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci PRIMARY KEY,
    schoolId VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    registeredBy VARCHAR(255),
    studentId VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    isChargeable BOOLEAN DEFAULT FALSE,
    INDEX (schoolId),
    CONSTRAINT fk_expense_school FOREIGN KEY (schoolId) REFERENCES schools(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Configurações
CREATE TABLE IF NOT EXISTS school_settings (
    schoolId VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci PRIMARY KEY,
    general_settings JSON,
    financial_settings JSON,
    CONSTRAINT fk_settings_school FOREIGN KEY (schoolId) REFERENCES schools(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Solicitações de Senha
CREATE TABLE IF NOT EXISTS password_reset_requests (
    id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci PRIMARY KEY,
    schoolId VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    schoolName VARCHAR(255),
    userEmail VARCHAR(255),
    userName VARCHAR(255),
    status ENUM('Pendente', 'Resolvido') DEFAULT 'Pendente',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Notificações
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci PRIMARY KEY,
    schoolId VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    userId VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    type VARCHAR(50),
    title VARCHAR(255),
    message TEXT,
    `read` BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    relatedId VARCHAR(50),
    INDEX (schoolId),
    CONSTRAINT fk_notif_school FOREIGN KEY (schoolId) REFERENCES schools(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Pedidos
CREATE TABLE IF NOT EXISTS school_requests (
    id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci PRIMARY KEY,
    schoolId VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    requesterId VARCHAR(50),
    recipientId VARCHAR(50),
    type VARCHAR(100),
    title VARCHAR(255),
    description TEXT,
    status VARCHAR(50),
    priority VARCHAR(50),
    feedback TEXT,
    metadata JSON,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (schoolId),
    CONSTRAINT fk_req_school FOREIGN KEY (schoolId) REFERENCES schools(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Discussões
CREATE TABLE IF NOT EXISTS discussion_topics (
    id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci PRIMARY KEY,
    schoolId VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    title VARCHAR(255),
    createdBy VARCHAR(50),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    participantIds JSON,
    status VARCHAR(50),
    INDEX (schoolId),
    CONSTRAINT fk_topic_school FOREIGN KEY (schoolId) REFERENCES schools(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS discussion_messages (
    id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci PRIMARY KEY,
    topicId VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    userId VARCHAR(50) NOT NULL,
    content TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    replyToId VARCHAR(50),
    INDEX (topicId),
    CONSTRAINT fk_msg_topic FOREIGN KEY (topicId) REFERENCES discussion_topics(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Inserir Super Admin Central
INSERT IGNORE INTO users (id, name, email, password, role) 
VALUES ('super_01', 'Administrador Central', 'admin@sistema.com', 'admin', 'SuperAdmin');
