
import { SchoolSettings, Student, AcademicYear, Turma } from "../types";

export const printTransferGuide = (
    student: Student,
    destinationSchool: string,
    reason: string,
    location: string,
    schoolSettings: SchoolSettings,
    academicYear: number,
    classLevel: string,
    includeGrades: boolean,
    includeHistory: boolean,
    operatorName: string,
    turmas: Turma[] = [] // Novo parâmetro opcional para compatibilidade, mas necessário para a coluna Classe
) => {
    const logoHtml = schoolSettings.schoolLogo 
        ? `<img src="${schoolSettings.schoolLogo}" alt="Logo" style="max-height: 90px; max-width: 90px;" />` 
        : '<div style="width: 90px; height: 90px; background: #eee; border-radius: 50%;"></div>';

    // Generate Grades Summary Table HTML if requested
    let gradesHtml = '';
    if (includeGrades && student.grades && student.grades.length > 0) {
        
        // 1. Get all unique years from student grades and sort them
        const uniqueYears = Array.from(new Set(student.grades.map(g => g.academicYear))).sort((a, b) => a - b);
        
        let rows = '';

        uniqueYears.forEach(year => {
            // Find the class level for this student in this year
            const historicalTurma = turmas.find(t => t.academicYear === year && t.studentIds.includes(student.id));
            // Se não encontrar turma (ex: dados antigos), tenta pegar do ano atual se coincidir, ou deixa traço
            const historicalClass = historicalTurma ? historicalTurma.classLevel : (year === academicYear ? classLevel : '-');

            // Filter grades for this specific year
            const yearGrades = student.grades!.filter(g => g.academicYear === year);
            
            // Function to calculate average for a specific period across all subjects
            const calculatePeriodAverage = (period: string) => {
                const gradesInPeriod = yearGrades.filter(g => g.period === period);
                if (gradesInPeriod.length === 0) return null;
                
                const sum = gradesInPeriod.reduce((acc, curr) => acc + (curr.grade || 0), 0);
                return sum / gradesInPeriod.length;
            };

            const avg1 = calculatePeriodAverage('1º Trimestre');
            const avg2 = calculatePeriodAverage('2º Trimestre');
            const avg3 = calculatePeriodAverage('3º Trimestre');

            // Calculate Annual Final Average (Mean of the trimesters present)
            let sumFinal = 0;
            let countFinal = 0;
            if (avg1 !== null) { sumFinal += avg1; countFinal++; }
            if (avg2 !== null) { sumFinal += avg2; countFinal++; }
            if (avg3 !== null) { sumFinal += avg3; countFinal++; }

            const finalAvg = countFinal > 0 ? sumFinal / countFinal : 0;
            
            // Determine Situation
            // Assuming 9.5 is the passing grade (rounds to 10)
            let situation = '-';
            let situationColor = 'black';

            if (countFinal > 0) {
                if (countFinal === 3 || (finalAvg < 9.5 && countFinal > 0)) {
                    // Se tem os 3 trimestres OU se já está reprovado matematicamente
                    situation = finalAvg >= 9.5 ? 'Aprovado' : 'Reprovado';
                    situationColor = finalAvg >= 9.5 ? 'black' : 'red';
                } else {
                    situation = 'Em Curso';
                    situationColor = 'gray';
                }
            }

            rows += `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${year}</td>
                    <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${historicalClass}</td>
                    <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${avg1 !== null ? avg1.toFixed(1) : '-'}</td>
                    <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${avg2 !== null ? avg2.toFixed(1) : '-'}</td>
                    <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${avg3 !== null ? avg3.toFixed(1) : '-'}</td>
                    <td style="padding: 8px; border: 1px solid #ccc; text-align: center; font-weight: bold; background-color: #f9f9f9;">${countFinal > 0 ? finalAvg.toFixed(1) : '-'}</td>
                    <td style="padding: 8px; border: 1px solid #ccc; text-align: center; color: ${situationColor}; font-weight: bold;">${situation}</td>
                </tr>
            `;
        });

        gradesHtml = `
            <div style="margin-top: 25px; page-break-inside: avoid;">
                <h4 style="margin-bottom: 0px; text-transform: uppercase; font-size: 12px; background-color: #eee; padding: 8px; border: 1px solid #ccc; border-bottom: none;">Histórico de Aproveitamento (Médias)</h4>
                <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                    <thead>
                        <tr style="background-color: #f0f0f0;">
                            <th style="padding: 8px; border: 1px solid #ccc; width: 50px;">Ano</th>
                            <th style="padding: 8px; border: 1px solid #ccc; width: 70px;">Classe</th>
                            <th style="padding: 8px; border: 1px solid #ccc;">Média 1º T</th>
                            <th style="padding: 8px; border: 1px solid #ccc;">Média 2º T</th>
                            <th style="padding: 8px; border: 1px solid #ccc;">Média 3º T</th>
                            <th style="padding: 8px; border: 1px solid #ccc;">Média Final</th>
                            <th style="padding: 8px; border: 1px solid #ccc;">Situação</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;

    } else if (includeGrades) {
        gradesHtml = '<p style="font-size: 11px; font-style: italic; margin-top: 10px;">Sem registo de notas no sistema.</p>';
    }

    // --- CALCULATE START YEAR LOGIC ---
    let startYear = new Date(student.matriculationDate).getFullYear();
    
    // Check Grades History
    if (student.grades) {
        student.grades.forEach(g => {
            if (g.academicYear < startYear) startYear = g.academicYear;
        });
    }
    // Check Payments History
    if (student.payments) {
        student.payments.forEach(p => {
            if (p.academicYear < startYear) startYear = p.academicYear;
        });
    }
    // Check Attendance History
    if (student.attendance) {
        student.attendance.forEach(a => {
            const y = new Date(a.date).getFullYear();
            if (!isNaN(y) && y < startYear) startYear = y;
        });
    }
    // -----------------------------------

    let historyHtml = '';
    if (includeHistory) {
        historyHtml = `
            <div style="margin-top: 20px; font-size: 12px; border-top: 1px dashed #ccc; padding-top: 10px;">
                <strong>Observações Complementares:</strong><br/>
                O aluno frequentou a instituição desde ${startYear}. 
                Comportamento registado no sistema: ${student.behavior ? student.behavior.length : 0} ocorrência(s).
                ${student.isTransferred ? '(Aluno transferido de: ' + (student.previousSchool || 'Outra escola') + ')' : ''}
            </div>
        `;
    }

    const documentHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Guia de Transferência - ${student.name}</title>
            <style>
                body { font-family: 'Times New Roman', serif; padding: 40px; color: #000; line-height: 1.5; }
                .container { max-width: 800px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 30px; }
                .school-name { font-size: 18px; font-weight: bold; text-transform: uppercase; margin: 5px 0; }
                .sub-header { font-size: 11px; margin-bottom: 20px; }
                
                .doc-title { text-align: center; font-size: 20px; font-weight: bold; text-transform: uppercase; text-decoration: underline; margin-bottom: 30px; }
                
                .content { font-size: 13px; text-align: justify; margin-bottom: 20px; }
                .field { font-weight: bold; }
                
                .signature-section { display: flex; justify-content: space-between; margin-top: 60px; page-break-inside: avoid; }
                .signature-box { text-align: center; width: 40%; }
                .line { border-top: 1px solid #000; margin-top: 40px; margin-bottom: 5px; }
                .role { font-size: 12px; font-weight: bold; }
                
                .footer { margin-top: 40px; font-size: 9px; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div style="margin-bottom: 10px;">${logoHtml}</div>
                    <div style="font-size: 12px; font-weight: bold;">REPÚBLICA DE MOÇAMBIQUE</div>
                    <div style="font-size: 11px;">MINISTÉRIO DA EDUCAÇÃO E DESENVOLVIMENTO HUMANO</div>
                    <div class="school-name">${schoolSettings.schoolName || 'NOME DA ESCOLA'}</div>
                    <div class="sub-header">
                        ${schoolSettings.address || ''} <br/>
                        Contatos: ${schoolSettings.contact || ''} | NUIT: ${schoolSettings.nuit || ''}
                    </div>
                </div>

                <div class="doc-title">Guia de Transferência</div>

                <div class="content">
                    <p>
                        A Direção da <strong>${schoolSettings.schoolName}</strong> certifica que, 
                        <span class="field" style="text-transform: uppercase;">${student.name}</span>, 
                        filho de ${student.fatherName || '__________________'} e de ${student.motherName || '__________________'}, 
                        nascido em ${new Date(student.birthDate).toLocaleDateString('pt-BR')}, 
                        portador do processo individual nº <span class="field">${student.id}</span>.
                    </p>
                    <p>
                        Encontra-se a frequentar a <span class="field">${classLevel}</span> no ano letivo de <span class="field">${academicYear}</span> 
                        nesta instituição de ensino.
                    </p>
                    <p>
                        Pela presente, é autorizado(a) a transferir-se para a escola 
                        <span class="field" style="text-transform: uppercase;">${destinationSchool}</span>, 
                        a pedido do seu Encarregado de Educação, por motivo de: 
                        <span style="font-style: italic;">${reason || 'Mudança de Residência'}</span>.
                    </p>
                    
                    ${gradesHtml}
                    ${historyHtml}

                    <p style="margin-top: 30px;">
                        Por ser verdade e ter sido solicitada, passa-se a presente Guia que vai assinada e autenticada com o carimbo a óleo em uso nesta escola.
                    </p>
                    
                    <p style="text-align: right; margin-top: 30px;">
                        ${location}, aos ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.
                    </p>
                </div>

                <div class="signature-section">
                    <div class="signature-box">
                        <div class="role">A Secretaria</div>
                        <div class="line"></div>
                        <div style="font-size: 11px;">(${operatorName})</div>
                    </div>
                    <div class="signature-box">
                        <div class="role">O Director da Escola</div>
                        <div class="line"></div>
                        <div style="font-size: 11px;">(Assinatura e Carimbo)</div>
                    </div>
                </div>
                
                <div class="footer">
                    Processado por computador pelo Sistema de Gestão Escolar.
                </div>
            </div>
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=900');
    if (printWindow) {
        printWindow.document.write(documentHtml);
        printWindow.document.close();
    }
};
