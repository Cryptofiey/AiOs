import React, { useState } from 'react';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import FS from '@isomorphic-git/lightning-fs';

// Инициализируем виртуальную файловую систему в IndexedDB
const fs = new FS('web-agent-os-fs');
const pfs = fs.promises;

export const GitVFSTest: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const log = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const testRun = async () => {
    setIsLoading(true);
    setLogs([]);
    const dir = '/hello-world';
    try {
      log('Подключение к виртуальной ФС (IndexedDB)...');
      
      log('Клонирование репозитория octocat/Hello-World через cors-прокси...');
      await git.clone({
        fs,
        http,
        dir,
        corsProxy: 'https://cors.isomorphic-git.org',
        url: 'https://github.com/octocat/Hello-World',
        singleBranch: true,
        depth: 1,
      });
      
      log('Клонирование завершено успешно! Чтение директории...');
      const files = await pfs.readdir(dir);
      log(`Файлы в корне: ${files.join(', ')}`);
      
      if (files.includes('README')) {
        const readme = await pfs.readFile(`${dir}/README`, 'utf8');
        log(`Содержимое README:`);
        log(String(readme));
      } else {
         log(`Файл README не найден.`);
      }
      
    } catch (err: any) {
        if (err.name === 'AlreadyExistsError') {
             log(`Репозиторий уже склонирован в ${dir}. Чтение директории...`);
             const files = await pfs.readdir(dir);
             log(`Файлы: ${files.join(', ')}`);
        } else {
             log(`ОШИБКА: ${err.message}`);
        }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 shadow-xl max-w-2xl w-full mx-auto my-8 font-sans">
        <h2 className="text-2xl font-bold mb-2 text-white">Фаза 1: Тест Git VFS (IndexedDB)</h2>
        <p className="text-sm text-slate-400 mb-6">Проверка гипотезы: клонирование GitHub-репозиториев напрямую в браузерную виртуальную файловую систему без использования бэкенда.</p>
        
        <button 
          onClick={testRun}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 px-5 py-2.5 rounded-lg font-semibold mb-6 transition-colors shadow-lg"
        >
          {isLoading ? 'Выполнение операции...' : 'Запустить Тест (Git Clone)'}
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
