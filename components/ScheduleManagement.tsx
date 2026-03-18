
import React, { useState, useMemo } from 'react';
import { Turma, Subject, User, ScheduleEntry, DayOfWeek, UserRole, SchoolSettings } from '../types';
import { CalendarIcon, TrashIcon, PlusIcon, SparklesIcon, PrinterIcon, CloseIcon, EditIcon } from './icons/IconComponents';
import { printSchedule } from './ReceiptUtils';

interface ScheduleManagementProps {
    turma: Turma;
    subjects: Subject[];
    users: User[];
    onUpdateTurma: (updatedTurma: Turma) => void;
    currentUser: User;
    settings: SchoolSettings;
}

const DAYS: DayOfWeek[] = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const ScheduleManagement: React.FC<ScheduleManagementProps> = ({ turma, subjects, users, onUpdateTurma, currentUser, settings }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [editingSlot, setEditingSlot] = useState<{ day: DayOfWeek, slot: { start: string, end: string } } | null>(null);
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [selectedTeacherId, setSelectedTeacherId] = useState('');

    const schedule = useMemo(() => turma.schedule || [], [turma.schedule]);

    const lessonDuration = settings.lessonDurationMinutes || 45;
    const breakDuration = settings.breakDurationMinutes || 15;

    const timeSlots = useMemo(() => {
        const slots: { start: string, end: string }[] = [];
        let startTime = '07:30';
        let numLessons = 6;

        if (turma.shift === 'Manhã') {
            startTime = '07:30';
        } else if (turma.shift === 'Tarde') {
            startTime = '13:00';
        } else {
            startTime = '18:00';
            numLessons = 5;
        }

        let currentMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);

        for (let i = 0; i < numLessons; i++) {
            const startH = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
            const startM = (currentMinutes % 60).toString().padStart(2, '0');
            const startStr = `${startH}:${startM}`;

            currentMinutes += lessonDuration;

            const endH = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
            const endM = (currentMinutes % 60).toString().padStart(2, '0');
            const endStr = `${endH}:${endM}`;

            slots.push({ start: startStr, end: endStr });

            // Adiciona intervalo após a 3ª aula (exemplo)
            if (i === 2) {
                currentMinutes += breakDuration;
            } else {
                // Pequeno intervalo entre aulas se desejar, ou nada. 
                // Para simplificar, vamos assumir que as aulas são seguidas exceto o intervalo principal.
            }
        }
        return slots;
    }, [turma.shift, lessonDuration, breakDuration]);

    const handleGenerateSchedule = () => {
        setIsGenerating(true);
        
        // Simulação de geração automática
        setTimeout(() => {
            const newSchedule: ScheduleEntry[] = [];
            const teacherAssignments = turma.teachers || [];
            
            if (teacherAssignments.length === 0) {
                alert("Nenhum professor atribuído a esta turma. Atribua professores primeiro.");
                setIsGenerating(false);
                return;
            }

            // Criar uma lista de aulas disponíveis (professor + disciplina)
            const availableLessons: { subjectId: string; teacherId: string }[] = [];
            teacherAssignments.forEach(ta => {
                ta.subjectIds.forEach(sid => {
                    // Adicionamos cada aula 2-3 vezes por semana para preencher o horário
                    for (let i = 0; i < 3; i++) {
                        availableLessons.push({ subjectId: sid, teacherId: ta.teacherId });
                    }
                });
            });

            if (availableLessons.length === 0) {
                alert("Nenhuma disciplina atribuída aos professores desta turma.");
                setIsGenerating(false);
                return;
            }

            // Embaralhar aulas
            const shuffled = [...availableLessons].sort(() => Math.random() - 0.5);
            let lessonIndex = 0;

            DAYS.forEach(day => {
                // Sábado tem menos aulas geralmente
                const slotsForDay = day === 'Sábado' ? timeSlots.slice(0, 3) : timeSlots;
                
                slotsForDay.forEach(slot => {
                    if (lessonIndex < shuffled.length) {
                        const lesson = shuffled[lessonIndex];
                        newSchedule.push({
                            dayOfWeek: day,
                            startTime: slot.start,
                            endTime: slot.end,
                            subjectId: lesson.subjectId,
                            teacherId: lesson.teacherId
                        });
                        lessonIndex++;
                    } else {
                        // Se acabarem as aulas, recomeça o shuffle para preencher tudo
                        lessonIndex = 0;
                        const lesson = shuffled[lessonIndex];
                        newSchedule.push({
                            dayOfWeek: day,
                            startTime: slot.start,
                            endTime: slot.end,
                            subjectId: lesson.subjectId,
                            teacherId: lesson.teacherId
                        });
                        lessonIndex++;
                    }
                });
            });

            onUpdateTurma({ ...turma, schedule: newSchedule });
            setIsGenerating(false);
        }, 1500);
    };

    const handleClearSchedule = () => {
        if (window.confirm("Tem certeza que deseja limpar o horário?")) {
            onUpdateTurma({ ...turma, schedule: [] });
        }
    };

    const getEntry = (day: DayOfWeek, startTime: string) => {
        return schedule.find(e => e.dayOfWeek === day && e.startTime === startTime);
    };

    const canManage = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SECRETARIA;

    const handleSaveEntry = () => {
        if (!editingSlot || !selectedSubjectId || !selectedTeacherId) return;

        const newEntry: ScheduleEntry = {
            dayOfWeek: editingSlot.day,
            startTime: editingSlot.slot.start,
            endTime: editingSlot.slot.end,
            subjectId: selectedSubjectId,
            teacherId: selectedTeacherId
        };

        const filteredSchedule = schedule.filter(e => !(e.dayOfWeek === editingSlot.day && e.startTime === editingSlot.slot.start));
        onUpdateTurma({ ...turma, schedule: [...filteredSchedule, newEntry] });
        setEditingSlot(null);
    };

    const handlePrint = () => {
        printSchedule(turma, subjects, users, settings);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <div>
                    <h3 className="text-lg font-bold text-indigo-900 flex items-center">
                        <CalendarIcon className="w-5 h-5 mr-2" />
                        Horário da Turma
                    </h3>
                    <p className="text-xs text-indigo-700">Organize as aulas semanais para esta turma.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button 
                        onClick={handlePrint}
                        className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-bold hover:bg-gray-50 transition-all"
                    >
                        <PrinterIcon className="w-4 h-4 mr-2" />
                        Imprimir
                    </button>
                    {canManage && (
                        <>
                            <button 
                                onClick={handleClearSchedule}
                                className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-white text-red-600 border border-red-100 rounded-lg text-sm font-bold hover:bg-red-50 transition-all"
                            >
                                <TrashIcon className="w-4 h-4 mr-2" />
                                Limpar
                            </button>
                            <button 
                                onClick={handleGenerateSchedule}
                                disabled={isGenerating}
                                className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 disabled:opacity-50"
                            >
                                {isGenerating ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                ) : (
                                    <SparklesIcon className="w-4 h-4 mr-2" />
                                )}
                                Gerar Automático
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto border rounded-xl shadow-sm bg-white">
                <table className="min-w-full divide-y divide-gray-200 border-collapse">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-widest border-r w-32">Horário</th>
                            {DAYS.map(day => (
                                <th key={day} className="px-4 py-3 text-center text-xs font-black text-gray-700 uppercase tracking-widest min-w-[150px]">
                                    {day}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {timeSlots.map((slot, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-4 whitespace-nowrap border-r bg-gray-50/50">
                                    <div className="text-sm font-black text-indigo-900">{slot.start}</div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase">até {slot.end}</div>
                                </td>
                                {DAYS.map(day => {
                                    const entry = getEntry(day, slot.start);
                                    const subject = entry ? subjects.find(s => s.id === entry.subjectId) : null;
                                    const teacher = entry ? users.find(u => u.id === entry.teacherId) : null;

                                    return (
                                        <td key={day} className="px-2 py-2 text-center border-l first:border-l-0">
                                            {entry ? (
                                                <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 group relative">
                                                    <div className="text-sm font-bold text-indigo-900 leading-tight mb-1">
                                                        {subject?.name || 'Disciplina'}
                                                    </div>
                                                    <div className="text-[10px] text-indigo-600 font-medium truncate">
                                                        Prof. {teacher?.name.split(' ')[0] || 'N/A'}
                                                    </div>
                                                    {canManage && (
                                                        <div className="absolute -top-1 -right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={() => {
                                                                    setEditingSlot({ day, slot });
                                                                    setSelectedSubjectId(entry.subjectId);
                                                                    setSelectedTeacherId(entry.teacherId);
                                                                }}
                                                                className="bg-indigo-500 text-white rounded-full p-0.5 shadow-sm hover:bg-indigo-600"
                                                            >
                                                                <EditIcon className="w-3 h-3" />
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    const newSchedule = schedule.filter(e => !(e.dayOfWeek === day && e.startTime === slot.start));
                                                                    onUpdateTurma({ ...turma, schedule: newSchedule });
                                                                }}
                                                                className="bg-red-500 text-white rounded-full p-0.5 shadow-sm hover:bg-red-600"
                                                            >
                                                                <TrashIcon className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                canManage && (
                                                    <button 
                                                        onClick={() => {
                                                            setEditingSlot({ day, slot });
                                                            // Tenta pre-selecionar o primeiro professor da turma
                                                            if (turma.teachers && turma.teachers.length > 0) {
                                                                setSelectedTeacherId(turma.teachers[0].teacherId);
                                                                setSelectedSubjectId(turma.teachers[0].subjectIds[0] || '');
                                                            } else {
                                                                setSelectedTeacherId('');
                                                                setSelectedSubjectId('');
                                                            }
                                                        }}
                                                        className="w-full h-12 border-2 border-dashed border-gray-100 rounded-lg flex items-center justify-center text-gray-300 hover:border-indigo-200 hover:text-indigo-300 transition-all"
                                                    >
                                                        <PlusIcon className="w-5 h-5" />
                                                    </button>
                                                )
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex items-start gap-3">
                <div className="bg-yellow-100 p-2 rounded-lg">
                    <SparklesIcon className="w-5 h-5 text-yellow-700" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-yellow-800">Dica de Geração Automática</h4>
                    <p className="text-xs text-yellow-700 leading-relaxed mt-1">
                        O sistema distribui as disciplinas atribuídas aos professores de forma equilibrada ao longo da semana. 
                        Certifique-se de que todos os professores e suas respectivas disciplinas foram corretamente vinculados à turma antes de gerar.
                    </p>
                </div>
            </div>

            {/* Modal de Edição de Slot */}
            {editingSlot && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
                        <div className="p-6 border-b flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">Definir Aula</h3>
                                <p className="text-xs text-gray-500">{editingSlot.day} • {editingSlot.slot.start} - {editingSlot.slot.end}</p>
                            </div>
                            <button onClick={() => setEditingSlot(null)} className="text-gray-400 hover:text-gray-600">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Professor</label>
                                <select 
                                    value={selectedTeacherId}
                                    onChange={(e) => {
                                        setSelectedTeacherId(e.target.value);
                                        const ta = turma.teachers?.find(t => t.teacherId === e.target.value);
                                        if (ta && ta.subjectIds.length > 0) {
                                            setSelectedSubjectId(ta.subjectIds[0]);
                                        }
                                    }}
                                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">Selecione um professor</option>
                                    {turma.teachers?.map(ta => {
                                        const teacher = users.find(u => u.id === ta.teacherId);
                                        return (
                                            <option key={ta.teacherId} value={ta.teacherId}>
                                                {teacher?.name || 'Professor Desconhecido'}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Disciplina</label>
                                <select 
                                    value={selectedSubjectId}
                                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">Selecione uma disciplina</option>
                                    {turma.teachers?.find(t => t.teacherId === selectedTeacherId)?.subjectIds.map(sid => {
                                        const subject = subjects.find(s => s.id === sid);
                                        return (
                                            <option key={sid} value={sid}>
                                                {subject?.name || 'Disciplina Desconhecida'}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>
                        <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                            <button 
                                onClick={() => setEditingSlot(null)}
                                className="px-6 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-all"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSaveEntry}
                                disabled={!selectedSubjectId || !selectedTeacherId}
                                className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
                            >
                                Confirmar Aula
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScheduleManagement;
