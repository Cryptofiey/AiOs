# Sema Soul Combine

Dynamic Semantic Crystallization and Interceptor Engine for LLMs.

This library allows you to dynamically shift the contextual behavior ("Point of Assembly") of biological AI / Large Language Models at runtime, grouping context into cognitive networks.

## Features
- **Crystallization Engine**: Generate deep Persona Trees out of simple tasks.
- **Semantic Interceptor Orchestrator**: Dynamically route chat messages through a contextual Combiner that activates/deactivates specific cognitive branches in your LLM based on conversation drift.

## Installation

```bash
npm install sema-soul-combine @google/genai
```

## Basic Usage

```typescript
import { SemanticCombine } from 'sema-soul-combine';

const combine = new SemanticCombine({ apiKey: process.env.GEMINI_API_KEY });

// 1. Give the agent a core structure
const tree = await combine.crystallizeTree("Fix a complicated Node.js memory leak");

// 2. Intercept messages and auto-shift context
const chatInput = "Actually, the leak is happening on the React frontend.";
const { updatedNodes, interceptorLog, agentResponse } = await combine.interceptChat(chatInput, tree);

console.log(interceptorLog); 
// Shows the orchestration logic (e.g. deactivated Backend, generated Frontend React hook nodes)
```
