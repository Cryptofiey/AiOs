import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), '.git-test');

async function runTest() {
  console.log('[Система] Инициализация изоморфного Git (Node.js Environment)...');
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    console.log('[Система] Клонируем octocat/Hello-World...');
    await git.clone({
      fs,
      http,
      dir,
      url: 'https://github.com/octocat/Hello-World',
      singleBranch: true,
      depth: 1
    });
    console.log('[Система] Успешно. Чтение файлов...');
    const files = fs.readdirSync(dir);
    console.log('[Система] Директория содержит:', files.join(', '));
    
    if (files.includes('README')) {
       console.log('[Система] Содержимое README:\n' + fs.readFileSync(path.join(dir, 'README'), 'utf8'));
    }
  } catch (e) {
    console.error('[Ошибка]', e);
  } finally {
    // Clean up
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

runTest();
