# gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools directly.

Available gstack skills:
- `/office-hours` — structured office hours / Q&A session
- `/plan-ceo-review` — CEO review of a plan
- `/plan-eng-review` — engineering review of a plan
- `/plan-design-review` — design review of a plan
- `/design-consultation` — design consultation
- `/design-shotgun` — rapid design exploration
- `/design-html` — generate HTML designs
- `/review` — code review
- `/ship` — ship a feature end-to-end
- `/land-and-deploy` — land and deploy changes
- `/canary` — canary deployment
- `/benchmark` — benchmark performance
- `/browse` — web browsing (use this for ALL web browsing)
- `/connect-chrome` — connect to Chrome browser
- `/qa` — full QA pass
- `/qa-only` — QA without shipping
- `/design-review` — review designs
- `/setup-browser-cookies` — set up browser cookies
- `/setup-deploy` — set up deployment
- `/setup-gbrain` — set up gbrain
- `/retro` — retrospective
- `/investigate` — investigate an issue
- `/document-release` — document a release
- `/document-generate` — generate documentation
- `/codex` — codex tasks
- `/cso` — CSO audit
- `/autoplan` — automatic planning
- `/plan-devex-review` — developer experience review of a plan
- `/devex-review` — developer experience review
- `/careful` — careful mode for risky changes
- `/freeze` — freeze the codebase
- `/guard` — guard against regressions
- `/unfreeze` — unfreeze the codebase
- `/gstack-upgrade` — upgrade gstack
- `/learn` — learning sessions

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
