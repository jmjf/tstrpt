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

Currently, the test location file:line isn't looking promising because the lines reported in the `TestsStream` are not source mapped to TypeScript lines.

Explore possibility of finding the offending line in the test file (and maybe a line on either side of it) and highlighting it.

## Output variability

After some examination, output for `node:assert` is different than output for `expect`. For example, they have different members in `cause`. In both cases, `cause.stack` is useful, though for `assert` it depends on an assertion message to show actual and expected values. In both cases, `error.cause` gives a message that shows the difference.

I've looked at tap output. It may prove easier to parse in some ways, but not others. I think the structured nature of `TestsStream` is more amenable to parsing.

Notes I made earlier that may be useful, though I need to think about priorities. I'd like to have a reporter that works for either `expect` or `node:assert`, so will need code to handle both. The output for `expect` includes `cause.matcherResult`, but for `node:assert` doesn't.

Basic plan

- Build a data structure that holds data about the test run (files enqueued/passed/failed, tests passed/failed, total exec time, for each file similar stats, failure details, etc.)
- Build code to load that structure as the test stream runs
- Build a function to render the data as test output
- Figure out how to overwrite previous output on screen
- Get smart about rerendering (identify output that should not be rerendered and position to avoid rerender)
- List all failures at end

Jest output
```

On start lists

[RUNS] <file path (gray)><filename (white)>

Test suites: <count> (0) of <filecount> total
Tests: <count> (0) total
Snapshots: <count> (0) total
Time: n.nn s

As tests run

increments tests/snapshots/files passed, failed, total
stdout/stderr to console between lines


As each file completes
[RUNS] -> [PASS] or [FAIL]
Adds (n.nn s) to the end (execution time)

Failure output
[FAIL] <file path (gray)><filename (white)> (n.nn s)
  * <test lineage (describe > describe)><test name>

     matcher message

         nn | code
         nn | code
      > nn| code
                  ^ below column
         nn| code
         nn | code

         first line of stack trace, file path blue

Pass output (single file  showing details)
[PASS] (rest same as fail)
   Describe name
       Describe name
           <check> <test name (gray)>

Fail output (single file showing details)
[FAIL] (rest same as fail above)
List of tests same as single file pass except failing tests have x instead of check
Failing test results at end as individual test fail above
```