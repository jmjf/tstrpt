# Planning

This document outlines the overall plan and will be updated as the plan develops

## General goals

- Experiment with Node's test runner
- Use `jest`'s `expect` as the assertion library (because I'm comfortable with it)
- Use TypeScript, because I prefer it
- Use ESM, because I prefer it
- Build a test reporter that includes
  - Outcome (PASS or FAIL)
  - Test name
  - Test location (file:line)
  - Failure reason (use formatted message from `expect`)
  - Specific line that failed
