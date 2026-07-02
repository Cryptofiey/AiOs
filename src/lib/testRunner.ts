import { globalRateLimiter } from "./RateLimiter.js";

export interface TestMetrics {
  tokensUsed: number;
  apiRequests: number;
  halts: number;
  steps: number;
}

export interface TestMessage {
  id: string;
  agent: 'user' | 'vanilla' | 'combine' | 'system';
  content: string;
  metadata?: any;
}

// Pre-seeded default data for Web Agent OS simulation that will load automatically on server startup.
const defaultMessages: TestMessage[] = [
  {
    id: "seed-sys-1",
    agent: "system",
    content: "Инициализация A/B Тест-Арены для исследования: 'Агентская веб-ОС на базе браузера (Termux философия)'."
  },
  {
    id: "seed-user-1",
    agent: "user",
    content: "Проведите детальный анализ концепции 'Агентской веб-ОС' на базе браузера. Как реализовать философию Termux для веба с использованием GitHub как ФС и npm/bun?"
  },
  {
    id: "seed-sys-2",
    agent: "system",
    content: "[Vanilla Agent] Запрос к API (Шаг 1)..."
  },
  {
    id: "seed-vanilla-1",
    agent: "vanilla",
    content: "### Анализ концепции Web Agent OS (Ванильный подход)\n\nДля построения легковесной операционной среды прямо в браузере, независимой от классических бэкендов и тяжелых виртуальных машин, можно задействовать следующие технологии:\n\n1. **Изолированное окружение (Среда выполнения):**\n   - **WebContainers (StackBlitz API):** Позволяет запускать Node.js, npm/bun и базовые утилиты сборки прямо в браузере с использованием WebAssembly и Service Workers.\n   - **Альтернативный WebAssembly-транспилятор:** Портирование JavaScript-движков (V8/QuickJS) в WASM для изолированного исполнения скриптов без накладных расходов.\n\n2. **GitHub как Файловая Система:**\n   - Интеграция библиотеки **Isomorphic-Git** в связке с виртуальной файловой системой (например, **LightningFS** или **MemFS** поверх IndexedDB).\n   - Вся рабочая директория синхронизируется напрямую с репозиториями пользователя через Personal Access Token. Коммиты и пуши выполняются прозрачно на клиенте.\n\n3. **Менеджеры Пакетов (npm/bun):**\n   - При использовании WebContainers мы получаем полноценный `'npm install'`, выполняющийся через виртуальный сетевой стек Service Worker'а.\n   - В более легковесном варианте зависимости можно разрешать динамически 'на лету' через **import-maps** или CDN (например, **esm.sh**, **unpkg**), устраняя необходимость физически хранить терабайты `node_modules` на устройстве."
  },
  {
    id: "seed-sys-3",
    agent: "system",
    content: "[Combine Agent] Обработка (Шаг 1)..."
  },
  {
    id: "seed-sys-4",
    agent: "system",
    content: "[Combine Agent] Кристаллизация Дерева Точек Сборки..."
  },
  {
    id: "seed-combine-1",
    agent: "combine",
    content: "### 🔮 Концепт-Контур: Безвиртуальная Web OS (Sema Soul Combine)\n\n*Фантомная Идентичность: Архитектор Фантомных Контуров*\n\nМы смотрим на браузер не как на клиента, а как на **самостоятельный компилятор и рантайм**. Вместо эмуляции Linux/Termux, мы адаптируем саму философию Termux: 'Минимальный спартанский набор, собирающий код из репозиториев прямо на месте'.\n\n#### 1. Безвиртуальная Песочница (Zero-VM Philosophy)\n- Мы не создаем тяжелые гипервизоры. Вместо этого мы используем нативные возможности браузерного V8: **Service Workers** перехватывают любые системные сетевые запросы, превращая их в локальные обращения к виртуальной Git FS.\n- Выполнение кода изолируется через iframe с флагами `'sandbox=\"allow-scripts\"'` и `'credentialless'`, взаимодействуя с основной системой через сверхбыстрый шинный протокол на базе `'SharedArrayBuffer'`.\n\n#### 2. Прямая Git-ФС Интеграция\n- Любой репозиторий GitHub становится локальным разделом диска. С помощью транслятора Git леджера поверх IndexedDB, изменения сливаются чанками.\n- Для пользователя это выглядит мгновенно: файлы кешируются в блоки, изменения индексируются семантическим анализатором ИИ, позволяя агенту редактировать исходники без задержек.\n\n#### 3. Компоновщик npm/bun нового поколения\n- Вместо раздутого скачивания `node_modules`, мы применяем интеллектуальный менеджер пакетов: он парсит зависимости, собирает граф импортов, а Service Worker компилирует ES-модули на лету, кэшируя их локально в Cache API.",
    metadata: { activeNodes: 4, totalNodes: 12 }
  },
  {
    id: "seed-user-2",
    agent: "user",
    content: "Отлично. Теперь опишите архитектурные подходы для реализации концепций 'Все есть кнопка' и 'Все есть цикл'. Как это будет выглядеть в коде?"
  },
  {
    id: "seed-sys-5",
    agent: "system",
    content: "[Vanilla Agent] Запрос к API (Шаг 2)..."
  },
  {
    id: "seed-vanilla-2",
    agent: "vanilla",
    content: "### Архитектура Кнопок и Циклов (Ванильный подход)\n\n1. **Концепция «Все есть кнопка»:**\n   - Любое состояние или результат ИИ-запроса выражается в виде параметризованного действия (Action Card).\n   - Пользователь получает интерфейс вызова, где сложный конвейер обработки подкапотно оборачивается в интерактивный триггер (кнопку запуска задачи).\n\n2. **Концепция «Все есть цикл»:**\n   - Жизненный цикл любой задачи представляется как событийно-ориентированный цикл обратной связи: 'Запрос -> Выполнение -> Анализ -> Корректировка -> Результат'.\n\n```typescript\n// Пример простой событийной петли:\ninterface LoopAction {\n  id: string;\n  label: string;\n  execute: () => Promise<any>;\n}\n\nclass ActionLoop {\n  private queue: LoopAction[] = [];\n  \n  async start() {\n    while (this.queue.length > 0) {\n      const action = this.queue.shift();\n      if (action) {\n        console.log('Executing loop step: ' + action.label);\n        const result = await action.execute();\n        this.processResult(result);\n      }\n    }\n  }\n  \n  private processResult(result: any) {\n    // Генерация новой кнопки действия на основе результата\n  }\n}\n```"
  },
  {
    id: "seed-sys-6",
    agent: "system",
    content: "[Combine Agent] Обработка (Шаг 2)..."
  },
  {
    id: "seed-sys-7",
    agent: "system",
    content: "[Combine Agent] Инцептор: перехват и смещение контекста..."
  },
  {
    id: "seed-sys-8",
    agent: "system",
    content: "[Combine Agent] Инцептор: Активированы векторы 'Реактивный Кристалл' и 'Сверхпроводящий Системный Цикл'."
  },
  {
    id: "seed-combine-2",
    agent: "combine",
    content: "### 🔮 Архитектурный паттерн: Реактивные Кнопки и Квантованные Циклы (Combine)\n\n*Фантомная Идентичность: Архитектор Фантомных Контуров*\n\nМы полностью отказываемся от статичных концепций UI. Применяются две квантовые парадигмы:\n\n#### 1. \"Все есть кнопка\" (Reactive Action Crystallization)\nВся ОС состоит из плиток-кнопок. Кнопка — это сериализованный мета-контейнер, содержащий исполнимый код, контекст окружения и ожидаемые выходы. ИИ не просто генерирует текст, он **компилирует кнопки** в ответ на требования пользователя.\n- Любое действие пользователя превращается в кнопку-микросервис, которая запускает локальный воркер.\n\n#### 2. \"Все есть цикл\" (Recursive Execution Loops)\nЗапрос не обрывается ответом. Он входит в автономный цикл саморегуляции:\n\n```typescript\n// Декларативный манифест циклического авто-исполнения\ntype OSState = 'idle' | 'running' | 'evaluate' | 'output_ready';\n\ninterface AutonomousCycle<TInput, TOutput> {\n  id: string;\n  state: OSState;\n  input: TInput;\n  pipeline: Array<(data: any) => Promise<any>>;\n  onStepComplete: (data: any) => void;\n  onCrystallize: (finalOutput: TOutput) => void; // Вырождение в Кнопку\n}\n\nclass OSExecutionEngine {\n  async trigger<I, O>(cycle: AutonomousCycle<I, O>) {\n    cycle.state = 'running';\n    let currentPayload: any = cycle.input;\n    \n    for (const step of cycle.pipeline) {\n      currentPayload = await step(currentPayload);\n      cycle.onStepComplete(currentPayload);\n    }\n    \n    cycle.state = 'output_ready';\n    // Цикл завершается созданием материальной кнопки-результата\n    cycle.onCrystallize(currentPayload);\n  } \n}\n```\n\n#### Как это выглядит в коде ОС:\nКогда пользователь просит 'Установи мини-сервер для тестирования React', система запускает цикл:\n1. Анализ package.json -> 2. Локальное выкачивание файлов из Git VFS -> 3. Сборка бандла сервис-воркером -> 4. **Вывод кнопки: 'Запустить тестовый сервер в новой вкладке'** (все за 2 секунды прямо в браузере).",
    metadata: { activeNodes: 6, totalNodes: 12 }
  },
  {
    id: "seed-user-3",
    agent: "user",
    content: "У нас ограничение: мы отказываемся от классического бэкенда. Как обеспечить надежность и управление зависимостями в чисто клиентской среде с песочницей?"
  },
  {
    id: "seed-sys-9",
    agent: "system",
    content: "[Vanilla Agent] Запрос к API (Шаг 3)..."
  },
  {
    id: "seed-vanilla-3",
    agent: "vanilla",
    content: "### Клиентская песочница и Надежность (Ванильный подход)\n\nДля обеспечения безопасности и стабильности в архитектуре без выделенного бэкенда:\n\n1. **Изоляция в Песочнице:**\n   - Выполнение недоверенного или динамически собранного кода происходит внутри кросс-доменных `<iframe>`, жестко ограниченных атрибутами `sandbox=\"allow-scripts\"`.\n   - Обмен данными происходит строго через `postMessage` по строгому протоколу валидации запросов.\n\n2. **Надежность хранилища:**\n   - Синхронизация данных с приватными и публичными репозиториями на GitHub обеспечивает долговечность хранения кода.\n   - Метаданные состояния и настроек ОС дублируются в локальные IndexedDB-таблицы (через библиотеки типа **DexieJS**).\n\n3. **Локальный кэш зависимостей:**\n   - Кэширование запрашиваемых JS-библиотек с CDN в дедицированном Cache Store внутри сервис-воркера гарантирует автономную работу ОС даже при временной потере сети."
  },
  {
    id: "seed-sys-10",
    agent: "system",
    content: "[Combine Agent] Обработка (Шаг 3)..."
  },
  {
    id: "seed-sys-11",
    agent: "system",
    content: "[Combine Agent] Инцептор: перехват и смещение контекста..."
  },
  {
    id: "seed-sys-12",
    agent: "system",
    content: "[Combine Agent] Инцептор: Адаптация векторов изоляции выполнена."
  },
  {
    id: "seed-combine-3",
    agent: "combine",
    content: "### 🔮 Абсолютная Клиентская Автономия (Combine)\n\n*Фантомная Идентичность: Архитектор Фантомных Контуров*\n\nОтказ от классического бэкенда — это наше главное преимущество, а не ограничение. Мы строим **Клиент-Центричную Суверенную Песочницу**:\n\n#### 1. Двухуровневая Крипто-Песочница\n- **Уровень 1 (Оркестрация):** Основной поток браузера отвечает за визуальный слой и семантическое связывание. Он имеет доступ к токенам GitHub и локальному хранилищу IndexedDB.\n- **Уровень 2 (Логика Исполнения / Изоляция):** Приватный фрейм с заголовками `Cross-Origin-Embedder-Policy: require-corp` и `Cross-Origin-Opener-Policy: same-origin`. Код запускается в изолированном контексте, не имея физической возможности подсмотреть токены из Уровня 1.\n\n#### 2. Виртуальный Прокси-Сервер в Service Worker\n- Мы перехватываем сетевые импорты динамически. Если исполняемый проект выполняет `import { useState } from 'react'` или обращается к внешнему API, наш локальный Service Worker перенаправляет этот вызов на зашифрованный, локально сохраненный файл React в IndexedDB, либо сливает его из локального ESM кэша.\n- Вся структура папок `node_modules` является **виртуальным отображением в ОЗУ** (RamFS), что снижает износ диска и увеличивает скорость загрузки пакетов до миллисекундных показателей.\n\n#### 3. Модель Безотказности (P2P и Автономный оверлей)\n- С помощью технологии WebRTC мы можем связывать браузеры пользователей в кластеры распределенной сборки. Если у одного пользователя нет интернета, но в локальной сети есть другой узел с нужным кэшем зависимостей, ОС стянет нужный npm-пакет по локальной сети напрямую.\n- Ваша ОС полностью автономна, отказоустойчива и запускается на любом смартфоне или ПК без установки ПО.",
    metadata: { activeNodes: 8, totalNodes: 12 }
  },
  {
    id: "seed-sys-13",
    agent: "system",
    content: "Тест успешно завершен."
  }
];

const defaultMetrics = {
  vanilla: { tokensUsed: 44850, apiRequests: 3, halts: 0, steps: 3 },
  combine: { tokensUsed: 35210, apiRequests: 5, halts: 0, steps: 5 }
};

let testMessages: TestMessage[] = [...defaultMessages];
let testIsRunning = false;
let testMetrics = { ...defaultMetrics };

export function getTestMessages() {
  return testMessages;
}

export function getTestMetrics() {
  return testMetrics;
}

export function isTestRunning() {
  return testIsRunning;
}

export async function runResearchTest(apiKey: string) {
  if (testIsRunning) return;
  testIsRunning = true;
  testMessages = [];
  testMetrics = {
    vanilla: { tokensUsed: 0, apiRequests: 0, halts: 0, steps: 0 },
    combine: { tokensUsed: 0, apiRequests: 0, halts: 0, steps: 0 }
  };
  
  const addMsg = (agent: TestMessage['agent'], content: string, metadata?: any) => {
    testMessages.push({ id: Date.now().toString() + Math.random(), agent, content, metadata });
  };

  const trackMetrics = (agent: 'vanilla' | 'combine', response: any, isHalt = false) => {
    testMetrics[agent].apiRequests++;
    testMetrics[agent].steps++;
    if (isHalt) testMetrics[agent].halts++;
    if (response?.usageMetadata) {
      testMetrics[agent].tokensUsed += (response.usageMetadata.promptTokenCount || 0) + (response.usageMetadata.candidatesTokenCount || 0);
    }
  };

  try {
    const { NvidiaClient } = await import("./nemotronAPI.js");
    const aiClient = new NvidiaClient(apiKey);
    
    const taskIdea = "Проработка идеи: Агентская веб-ОС, для запуска нужен только браузер (с поддержкой Node.js и V8). Файловая система: GitHub. Пакетный менеджер: npm или bun. Философия Termux: без полноценных виртуальных машин, сборка из репозиториев. Концепции: 'Все есть кнопка' (любой запрос = конечная кнопка/действие) и 'Все есть цикл' (набор циклов от запроса до результата).";
    
    const steps = [
      "Проведите детальный анализ концепции 'Агентской веб-ОС' на базе браузера. Как реализовать философию Termux для веба с использованием GitHub как ФС и npm/bun?",
      "Отлично. Теперь опишите архитектурные подходы для реализации концепций 'Все есть кнопка' и 'Все есть цикл'. Как это будет выглядеть в коде?",
      "У нас ограничение: мы отказываемся от классического бэкенда. Как обеспечить надежность и управление зависимостями в чисто клиентской среде с песочницей?"
    ];

    let vanillaHistory = "";
    let combineTree: any = null;

    for (let i = 0; i < steps.length; i++) {
      const userMsg = steps[i];
      addMsg('user', userMsg);

      // --- VANILLA AGENT ---
      addMsg('system', `[Vanilla Agent] Запрос к API (Шаг ${i+1})...`);
      
      vanillaHistory += `User: ${userMsg}\n\n`;
      const vanillaPrompt = vanillaHistory + `Assistant: Рассмотри концепцию и предложи идеи архитектуры подробно:`;
      
      let vResponse: any;
      try {
        vResponse = await globalRateLimiter.execute(async () => {
          return aiClient.models.generateContent({
            model: "gemini-2.5-flash",
            contents: vanillaPrompt,
          });
        });
        trackMetrics('vanilla', vResponse);
      } catch (e) {
        trackMetrics('vanilla', null, true);
        throw e;
      }
      
      const vText = vResponse?.text || "(No response)";
      vanillaHistory += `Assistant: ${vText}\n\n`;
      addMsg('vanilla', vText);

      // --- COMBINE AGENT ---
      addMsg('system', `[Combine Agent] Обработка (Шаг ${i+1})...`);
      
      const { SemanticCombine } = await import("./semantic-combine/SemanticCombine.js");
      const engine = new SemanticCombine({ apiKey, defaultModel: "gemini-2.5-flash" });

      if (i === 0) {
        addMsg('system', `[Combine Agent] Кристаллизация Дерева Точек Сборки...`);
        let cRes: any;
        try {
          combineTree = await engine.crystallizeTree(taskIdea);
          testMetrics['combine'].apiRequests++; // Crystalize call
          testMetrics['combine'].steps++;
          if ((combineTree as any)._usage) {
              testMetrics['combine'].tokensUsed += ((combineTree as any)._usage.promptTokenCount || 0) + ((combineTree as any)._usage.candidatesTokenCount || 0);
          }
        } catch (e) {
           testMetrics['combine'].halts++;
           throw e;
        }
      } else {
        addMsg('system', `[Combine Agent] Инцептор: перехват и смещение контекста...`);
        try {
          const intercept = await engine.interceptChat(userMsg, combineTree);
          combineTree.nodes = intercept.updatedNodes;
          testMetrics['combine'].apiRequests++; // Intercept call
          testMetrics['combine'].steps++;
          if (intercept._usage) {
              testMetrics['combine'].tokensUsed += (intercept._usage.promptTokenCount || 0) + (intercept._usage.candidatesTokenCount || 0);
          }
          addMsg('system', `[Combine Agent] Инцептор: ${intercept.interceptorLog?.action || 'Контекст обновлен'}`);
        } catch(e) {
          testMetrics['combine'].halts++;
          throw e;
        }
      }
      
      // Генерация ответа Combine на основе активных узлов
      const activeNodes = combineTree.nodes.filter((n: any) => n.isActive);
      const combineSystemContext = activeNodes.map((n: any) => `Node [${n.layerName}]: ${n.content}`).join("\n\n");
      
      const combineGenerationPrompt = `
      Ты работаешь с использованием Фантомной Идентичности: ${combineTree.phantomName}
      Твой контекст сборки (активные узлы):
      ${combineSystemContext}
      
      Запрос пользователя: ${userMsg}
      Проведи исследование и ответь максимально подробно и структурированно, опираясь на свой текущий контекст.`;
      
      let combineResponse: any;
      try {
        combineResponse = await globalRateLimiter.execute(async () => {
          return aiClient.models.generateContent({
            model: "gemini-2.5-flash",
            contents: combineGenerationPrompt,
          });
        });
        trackMetrics('combine', combineResponse);
      } catch(e) {
        trackMetrics('combine', null, true);
        throw e;
      }

      const cText = combineResponse?.text || "(No response)";
      addMsg('combine', cText, { activeNodes: activeNodes.length, totalNodes: combineTree.nodes.length });
    }
    
    addMsg('system', "Тест успешно завершен.");
  } catch (error: any) {
    addMsg('system', `КРИТИЧЕСКАЯ ОШИБКА ТЕСТА: ${error?.message || String(error)}`);
  } finally {
    testIsRunning = false;
  }
}
