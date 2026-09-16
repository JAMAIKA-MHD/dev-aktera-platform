# GITLAB ISSUES, Board & Workflow

**1. Issue Naming Format**

- **Bugs:** `fix/ <short-description>` _(e.g., `fix/ bulk-voucher-import-fails`)_
- **Enhancements:** `<module>/<enhancement-name>` _(Modules: `Engagement-Engine`, `Insights-Engine`, `Player-Screen`, `Inventory-engine`, `DATA-engine` , `Organization&Account` `Billing` . e.g., `Insights-Engine/export-data-to-csv`)_
- **New Ideas:** **`[New Idea]** <topic> or <module> / <descriptive-name>` _(e.g., `[New Idea] agentic-workflows/ auto-segmentation`)_

**2. What to Include in the Description**

- **For Bugs:** Explain what is broken, list steps to reproduce it, and describe what should happen instead.
- **For Enhancements:** Explain what feature/improvement needs to be built and why (user/business value).
- **For New Ideas:** Provide an overview of the concept, the overall goal, and specific open questions for the team to discuss.
- **For Infra / Docs:** Mention the specific pipeline, hosting environment, or documentation file involved and what needs updating.

**For Active Work & Execution:**

- `PENDING`: Approved backlog tasks ready to be worked on.
- `ALWAYS-ON`: for tasks that are ongoing and not time-bound so they don’t end , its always a task to do (e.g., codebase documentation, system state docs, Ideas …..).
- `Current Work`: Set by Dev when actively working on the task right now.
- `URGENT` / `IMPORTANT`: High priority or blocking issues.
- `NEED-HELP` / `question`: Blocked or requiring team discussion.

**3. How to Pick Labels (Step-by-Step for Every Case)**

- **Case 1: Reporting a Bug**

➔ Select `BUG` + priority (`URGENT` if critical/blocking, or `IMPORTANT`).

- **Case 2: Working on a Planned Feature or UI Update**

➔ Select `ENHANCEMENT` + active status (`PENDING` if queued, or `Current Work` if actively in progress).

- **Case 3: Pitching a New Idea / Brainstorm Concept**

➔ Select `New Idea` + `Discussion` + ONE category (`ENHANCEMENT` for product features, `INFRA` for devops/tools, or `BRAND` for identity/design). _(Note: Never pair `New Idea` with `BUG`)._

- **Case 4: DevOps, Pipelines, or Infrastructure**

➔ Select `INFRA` + (`ENHANCEMENT` if setting up new pipelines/hosting, or `BUG` if a deployment script failed).

- **Case 5: Continuous / Ongoing Work**

  ➔ Select `ALWAYS-ON` + (`documentation` for system state docs, or `BRAND` for assets).

- **Case 6: Blocked or Needs Clarification**

➔ Add `NEED-HELP` or `question` to any issue where you are blocked or waiting on answer/specs.

Let's stick to these standards for all new tickets so everything stays clean! Let me know if anything is unclear.
