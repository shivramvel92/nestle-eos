# STRIDE AI on Paperclip

Recreates the **STRIDE AI** organization in [Paperclip](https://paperclip.ing). It has 35 AI agents that act as an SAP System Integrator, plus 1 company goal and 8 team goals.

## Run it on your machine

You need Node.js 24.11 or newer.

```bash
# 1. Install and start Paperclip. Leave it running and open http://127.0.0.1:3100
npx paperclipai@latest onboard --yes

# 2. In a second terminal, from this repository
node paperclip/stride-ai-setup.mjs
#    for a different server: node paperclip/stride-ai-setup.mjs --url http://host:3100
```

## Runtimes

| Runtime | Model | Roles |
|---|---|---|
| Claude Code (`claude_local`) | Claude Opus 5.5 | CEO, CTO, Delivery Manager, Enterprise, Solution and Technical Architects |
| Claude Code (`claude_local`) | Claude Sonnet 5.5 | CFO, COO, Program Manager, Project Managers, Workstream Leads, Test, Training and Cutover Managers |
| OpenCode (`opencode_local`) | Qwen3 Coder, open source, via OpenRouter | Technical Consultants, Testers |
| OpenCode (`opencode_local`) | DeepSeek V3.2, open source, via OpenRouter | Functional Consultants, Training Content Developers |

## Before agents can run

- **Claude Code agents.** Install Claude Code (`npm i -g @anthropic-ai/claude-code`) and sign in with `claude`, or set `ANTHROPIC_API_KEY`.
- **OpenCode agents.** Install OpenCode (`npm i -g opencode-ai`), then run `opencode auth login` and choose OpenRouter, or set `OPENROUTER_API_KEY`. These agents stay paused in "verifying" until the key is set.
- **Don't run Paperclip as root.** Claude Code won't run unattended as root outside a sandbox.

To change any role, model or reporting line, edit the `ORG` table in `stride-ai-setup.mjs`.
