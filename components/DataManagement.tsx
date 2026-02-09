
import React, { useRef } from 'react';
import { CloudArrowDownIcon, CloudArrowUpIcon, ExclamationTriangleIcon } from './icons/IconComponents';

interface DataManagementProps {
    schoolId?: string;
    isSuperAdmin?: boolean;
}

const DataManagement: React.FC<DataManagementProps> = ({ schoolId, isSuperAdmin }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        const backupData: Record<string, string> = {};
        
        // Iterar por todo o localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                // Se for Super Admin, exporta TUDO (SaaS global + Escolas)
                // Se for Admin de escola, exporta apenas os dados daquela escola específica
                if (isSuperAdmin) {
                    if (key.startsWith('school_') || key.startsWith('saas_')) {
                        backupData[key] = localStorage.getItem(key) || '';
                    }
                } else if (schoolId) {
                    if (key.startsWith(`school_${schoolId}`)) {
                        backupData[key] = localStorage.getItem(key) || '';
                    }
                }
            }
        }

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        link.href = url;
        link.download = `backup_sei_smart_${isSuperAdmin ? 'global' : 'escola'}_${date}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!window.confirm("ATENÇÃO: Importar dados irá substituir as informações atuais deste navegador. Deseja continuar?")) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const data = JSON.parse(content);
                
                Object.entries(data).forEach(([key, value]) => {
                    localStorage.setItem(key, value as string);
                });

                alert("Dados importados com sucesso! O sistema irá reiniciar para aplicar as mudanças.");
                window.location.reload();
            } catch (err) {
                alert("Erro ao ler o arquivo de backup. Certifique-se que é um arquivo JSON válido gerado pelo SEI Smart.");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100">
            <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center">
                <CloudArrowDownIcon className="w-6 h-6 mr-2 text-indigo-600" />
                Segurança e Backup de Dados
            </h3>
            <p className="text-sm text-gray-500 mb-6">
                Como os seus dados são armazenados localmente, é fundamental criar cópias de segurança regulares. 
                Guie este arquivo em um local seguro fora deste dispositivo.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                    onClick={handleExport}
                    className="flex items-center justify-center gap-3 p-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                >
                    <CloudArrowDownIcon className="w-5 h-5" />
                    EXPORTAR BACKUP AGORA
                </button>

                <button 
                    onClick={handleImportClick}
                    className="flex items-center justify-center gap-3 p-4 bg-white text-indigo-600 border-2 border-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-all"
                >
                    <CloudArrowUpIcon className="w-5 h-5" />
                    RESTAURAR DE ARQUIVO
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileImport} 
                    className="hidden" 
                    accept=".json" 
                />
            </div>

            <div className="mt-6 flex items-start gap-3 bg-amber-50 p-4 rounded-xl border border-amber-100">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="text-xs text-amber-800">
                    <p className="font-bold">Aviso importante:</p>
                    <p>Limpar o histórico do navegador (cookies e dados de sites) pode apagar as informações se não tiver um backup. Recomendamos fazer um backup semanal.</p>
                </div>
            </div>
        </div>
    );
};

export default DataManagement;
