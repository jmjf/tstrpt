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

Jest output (for reference)
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

## Data

So, let's say we have something like

```typescript
{
  files: [
    {
      filePath: string,
      fileName: string,
      status: 'runs' | 'started' | 'pass' | 'fail',
      runTimeMs: number,
      suites: [
        {
          suiteName: string,
          status: 'runs' | 'started' | 'pass' | 'fail',
          runTimeMs: number,
          tests: [
            {
              testName: string,
              status: 'runs' | 'started' | 'pass' | 'fail',
              runTimeMs: number,
              matcherMessage: string,
              stackLine: string,      // the first line of the stack trace,
            }
          ]
        }
      ]
    }
  ]
}
```

But that doesn't address deeper nesting.

Let's look at it this way (filtering some low-value attributes)

- Enqueue
  - nesting
  - name (of file for file-level, of wrapper for others)
  - file (for anything that isn't a file-level)
  - line and column (not TS-friendly)
- Dequeue -> same as enqueue
- Start
  - nesting
  - name (of suite/test/subtest)
  - file
  - line and column
- Pass
  - name
  - nesting
  - test number (in the suite or file)
  - durationMs
  - file
  - line and column
- Fail same as Pass plus
  - error
    - failure type (varies by assertion library)
    - code (varies by assertion library)
    - cause
      - matcher message
- Fail for wrappers as Pass plus
  - type (suite)
  - error
    - failure type
    - cause
    - code
- Diagnostic
  - nesting
  - message (usually type and count except total run time)

If we assume files run in parallel, for a given file, start start means a suite and test (or subsuite) within the suite.

If suites within a file run concurrently, the stream may get muddy. I don't see anything in the pass or fail messages that relate a message to a specific suite. I may be able to use line and column to sequence or relate to enqueues to establish groups. For now, I'm not going to worry about this issue.

- Everything has a nesting.
- Everything except a diagnostic has a name, file, line, and column.
- Pass and fail both have test number and duration ms.
- Fail has an error.

Let's also assume that a suite doesn't have any assertions, is only a wrapper

```typescript
{
  files: [ {            // get from enqueue with no file (name = file)
    file: string,
    filePath: string,   // split to make formatting simpler ???
    fileName: string, 
    status: runs | start | pass | fail 
  } ],
  suites: [ {
     fileIdx: number,   // files[fileIdx].file = file from suite start
     parentSuiteIdx: number | null, 
     nesting: number,
     name: string,
     line: number,
     column: number,
     durationMs: number,
     status: runs | start | pass | fail 
  } ],
  tests: [ {            // try to identify tests by pass/fail and ignore start b/c names may not be unique
    suiteIdx: number,
    nesting: number,    // helps set ident
    testNumber: number, 
    durationMs: number,
    passFlag: boolean,
    failureType: string | null,
    code: string | null,
    causeMessage: string | null,
  } ]
}
```

Because of how nesting behaves, I may need a stack of starts. Need to think about the stream a bit.

Build more complete test data (test tests) -- multi-file, multi-suite, see what happens when suites pass, expect and assert, etc.


