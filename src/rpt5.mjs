import path from 'node:path';
import { fileURLToPath } from 'node:url';

function getTestSummary(testFiles, tests) {
    let summary = '';
    testFiles.forEach(f => summary += `RAN ${f.file} suites: ${f.suiteCount}; tests: ${f.testCount}; pass: ${f.passCount}; fail: ${f.failCount}\n`);

    // sort tests by fileIdx and testLine
    tests.sort((a, b) => a.fileIdx === b.fileIdx ? a.testLine - b.testLine : a.fileIdx - b.fileIdx);
    tests.forEach(t => {
        return summary += `${'   '.repeat(t.nesting)}${t.testName}\n`; // -> ` + 
        // `${testFiles[t.fileIdx].filePath} - ${testFiles[t.fileIdx].fileName}\n`;
    });
    summary += JSON.stringify(tests, null, 3);
    return summary;
}

export default async function* rpt5(source) {
    const testFiles = [];
    const tests = [];

    function findTestIdxForData(tests, data) {
        const fileIdx = testFiles.findIndex(f => f.file === fileURLToPath(data.file));
        return tests.findIndex(t => t.testName === data.name &&
            t.nesting === data.nesting &&
            t.testLine === data.line &&
            t.fileIdx === fileIdx
        );
    }

    function findParent(fileIdx, data) {
        // console.log('findParent start', fileIdx, data);
        const filtered = tests.filter(t => ((t.fileIdx === fileIdx) &&
            (t.nesting === data.nesting - 1) &&
            (t.testLine < data.line)
        ));
        return filtered.reduce((prv, cur) => {
            if (prv === -1) return cur.idx;
            return (cur.testLine > tests[prv].testLine ? cur.idx : prv);
        }, -1);
        // console.log('findParent', idx, data.line, data.name, tests[idx].testLine, tests[idx].testName);     
    }

    function incrementParentChain(idx, attrName) {
        while (tests[idx].parentIdx >= 0) {
            idx = tests[idx].parentIdx;
            tests[idx][attrName]++;
        }
    }
    
    for await (const event of source) {
        let idx = -1;
        let msg = '';

        switch (event.type) {
            case 'test:enqueue':
                if ((event.data.nesting === 0) && (event.data.file === undefined)) {
                    testFiles.push({
                        idx: testFiles.length || 0,
                        file: event.data.name,                        
                        fileName: path.basename(event.data.name),
                        filePath: path.dirname(event.data.name),
                        isDequeued: false,
                        isStarted: false,
                        isComplete: false,
                        testCount: 0,
                        suiteCount: 0,
                        passCount: 0,
                        failCount: 0
                    });
                    msg = `RUNS ${event.data.name}\n`;
                } else {
                    const fileIdx = testFiles.findIndex(f => f.file === fileURLToPath(event.data.file))
                    tests.push({
                        idx: tests.length || 0,
                        testName: event.data.name,
                        testLine: event.data.line,
                        nesting: event.data.nesting,
                        fileIdx,
                        parentIdx: (event.data.nesting > 0) ? findParent(fileIdx, event.data) : -1,
                        isStarted: false,
                        isComplete: false,
                        testCount: 0,  // arguably, passed + failed
                        suiteCount: 0,
                        passCount: 0,
                        failCount: 0,
                    });
                    msg = `test:enqueue - ${event.data.name}\n`;
                }
                yield msg;
                break;
            case 'test:dequeue':
                if ((event.data.nesting === 0) && (event.data.file === undefined)) {
                    const i = testFiles.findIndex(f => f.file === event.data.name);
                    if (i >= 0) {
                        testFiles[i].isDequeued = true;
                        msg = `${testFiles[i].file} dequeued\n`;
                    } else {
                        msg = `${event.data.name} not found\n`;
                    }
                } else {
                    msg = `test:dequeue ${event.data.name}\n`;
                }
                yield msg;
                break;
            case 'test:start':
                idx = findTestIdxForData(tests, event.data)
                if (idx === -1) {
                    msg = `no test found for ${JSON.stringify(event.data, null, 3)}`;
                } else {
                    tests[idx].isStarted = true;
                    msg = `started ${tests[idx].testName}\n`;
                }
                yield msg;
                break;           
            case 'test:pass': 
                idx = findTestIdxForData(tests, event.data);
                if (idx === -1) {
                    msg = `no test found for ${JSON.stringify(event.data, null, 3)}`;
                } else {
                    msg = `passed ${tests[idx].testName}\n`;
                    tests[idx].isComplete = true;
                    // children will have counts of 0 because nothing below them increments
                    if (tests[idx].passCount + tests[idx].failCount === 0) {
                        tests[idx].passCount = 1;                        
                        testFiles[tests[idx].fileIdx].passCount++;
                        testFiles[tests[idx].fileIdx].testCount++;
                    
                        // increment pass counts up the parent chain
                        incrementParentChain(idx, 'passCount');
                        incrementParentChain(idx, 'testCount');
                    } else {
                        // suite pass -- don't increment pass counts because children cover that
                        // Assumes suites don't have assertions outside child tests
                        testFiles[tests[idx].fileIdx].suiteCount++;
                        incrementParentChain(idx, 'suiteCount');
                    }
                }
                yield msg;
                break;
            case 'test:fail': 
                idx = findTestIdxForData(tests, event.data);
                if (idx === -1) {
                    msg = `no test found for ${JSON.stringify(event.data, null, 3)}`;
                } else {
                    msg = `failed ${tests[idx].testName}\n`;
                    tests[idx].isComplete = true;
                    // children will have counts === 0 because nothing below them increments
                    if (tests[idx].passCount + tests[idx].failCount === 0) {
                        tests[idx].failCount = 1;                        
                        testFiles[tests[idx].fileIdx].failCount++;
                        testFiles[tests[idx].fileIdx].testCount++;
                    
                        // increment fail counts up the parent chain
                        incrementParentChain(idx, 'failCount');
                        incrementParentChain(idx, 'testCount');
                    } else {
                        // suite fail -- don't increment pass counts because children cover
                        // Assumes suites don't have assertions outside child tests
                        testFiles[tests[idx].fileIdx].suiteCount++;
                        incrementParentChain(idx, 'suiteCount');
                    }
                }
                yield msg;
                break;          
            default:
                yield `${event.type} ${event.data.name}\n`;
                break;
        }
    }
    yield getTestSummary(testFiles, tests);
}