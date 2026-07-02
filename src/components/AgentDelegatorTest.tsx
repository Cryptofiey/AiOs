import React, { useState } from 'react';
import { AgentDelegator } from '../lib/supervisor/AgentDelegator';

export const AgentDelegatorTest: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const log = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const runTest = async () => {
    setIsLoading(true);
    setLogs([]);
    try {
      log('Инициализация AgentDelegator...');
      const delegator = new AgentDelegator();
      
      const phantomRole = 'Кристаллизатор Интерфейса';
      const task = 'Создай простую JSON-схему для карточки пользователя (UserCard), которая содержит поля: имя, аватар, статус_активности. Верни только JSON.';
      
      log(`Запуск суб-агента [${phantomRole}] с задачей: ${task}`);
      
      // Выполняем делегирование
      const result = await delegator.delegateTask(phantomRole, task);
      
      log('Суб-агент успешно завершил задачу! Результат:');
      // Пытаемся распарсить или просто выводим текст
      try {
        // extract json from markdown
        const jsonMatch = result.match(/```(?:json)?\n([\s\S]*?)```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : result;
        const parsed = JSON.parse(jsonStr);
        log(JSON.stringify(parsed, null, 2));
      } catch (e) {
        log(result);
      }
      
      log('Тест делегирования успешно завершен.');
    } catch (err: any) {
      log(`ОШИБКА: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 shadow-xl max-w-2xl w-full mx-auto my-8 font-sans">
        <h2 className="text-2xl font-bold mb-2 text-white">Фаза 3: Тест Делегирования (AgentDelegator)</h2>
        <p className="text-sm text-slate-400 mb-6">Проверка гипотезы: способность супервизора запускать суб-агентов через Sema Soul Combine для выполнения изольрованных задач.</p>
        
        <button 
          onClick={runTest}
          disabled={isLoading}
          className="bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 px-5 py-2.5 rounded-lg font-semibold mb-6 transition-colors shadow-lg"
        >
          {isLoading ? 'Делегирование...' : 'Запустить Тест (Делегирование задачи)'}
        </button>
        
        <div className="bg-slate-950 p-4 font-mono text-sm h-72 overflow-y-auto rounded border border-slate-800 whitespace-pre-wrap">
          {logs.length === 0 && <span className="text-slate-600">Логи тестирования появятся здесь...</span>}
          {logs.map((l, i) => (
            <div key={i} className={l.startsWith('ОШИБКА') ? 'mb-1 text-red-400' : 'mb-1 text-emerald-400'}>{l}</div>
          ))}
        </div>
    </div>
  );
}
