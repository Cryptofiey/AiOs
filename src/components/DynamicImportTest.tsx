import React, { useState } from 'react';

export const DynamicImportTest: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const log = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const runTest = async () => {
    setIsLoading(true);
    setLogs([]);
    try {
      log('Подготовка к динамическому импорту через esm.sh...');
      
      // Динамически импортируем canvas-confetti
      log("Выполняем: await import('https://esm.sh/canvas-confetti')");
      // @ts-ignore
      const confettiModule = await import('https://esm.sh/canvas-confetti');
      const confetti = confettiModule.default;
      
      log('Модуль canvas-confetti успешно загружен! Запуск эффекта...');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      log('Тест успешно завершен. Модуль подгружен и выполнен на клиенте без npm install.');
    } catch (err: any) {
      log(`ОШИБКА: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 shadow-xl max-w-2xl w-full mx-auto my-8 font-sans">
        <h2 className="text-2xl font-bold mb-2 text-white">Фаза 2: Тест Динамического импорта (esm.sh)</h2>
        <p className="text-sm text-slate-400 mb-6">Проверка гипотезы: загрузка и выполнение внешних библиотек "на лету" без npm install, необходимая для автономного режима.</p>
        
        <button 
          onClick={runTest}
          disabled={isLoading}
          className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 px-5 py-2.5 rounded-lg font-semibold mb-6 transition-colors shadow-lg"
        >
          {isLoading ? 'Загрузка...' : 'Запустить Тест (esm.sh -> Confetti)'}
        </button>
        
        <div className="bg-slate-950 p-4 font-mono text-sm h-72 overflow-y-auto rounded border border-slate-800">
          {logs.length === 0 && <span className="text-slate-600">Логи тестирования появятся здесь...</span>}
          {logs.map((l, i) => (
            <div key={i} className={l.startsWith('ОШИБКА') ? 'mb-1 text-red-400' : 'mb-1 text-emerald-400'}>{l}</div>
          ))}
        </div>
    </div>
  );
}
