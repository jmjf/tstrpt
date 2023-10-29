import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

function getTestSummary(testFiles, tests) {
    let summary = '';
    testFiles.forEach(f => summary += `RAN ${f.file}\n`);

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
   let idx = -1;

    function findTestIdxForData(tests, data) {
        const fileIdx = testFiles.findIndex(f => f.file === fileURLToPath(data.file));
        return tests.findIndex(t => t.testName === data.name &&
            t.nesting === data.nesting &&
            t.testLine === data.line &&
            t.fileIdx === fileIdx
        );
    }

    function findParent(fileIdx, data) {
        console.log('findParent start', fileIdx, data);
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
    
    for await (const event of source) {
        switch (event.type) {
            case 'test:enqueue':
                if ((event.data.nesting === 0) && (event.data.file === undefined)) {
                    testFiles.push({
                        idx: testFiles.length || 0,
                        file: event.data.name,                        
                        fileName: path.basename(event.data.name),
                        filePath: path.dirname(event.data.name),
                        isStarted: false,
                        isComplete: false,
                        passed: 0,
                        failed: 0
                    });
                    yield `RUNS ${event.data.name}\n`;
                } else {
                    const fileIdx = testFiles.findIndex(f => f.file === fileURLToPath(event.data.file))
                    const test = {
                        idx: tests.length || 0,
                        testName: event.data.name,
                        testLine: event.data.line,
                        nesting: event.data.nesting,
                        fileIdx,
                        parentIdx: (event.data.nesting > 0) ? findParent(fileIdx, event.data) : -1,
                        isStarted: false,
                        isComplete: false,
                        passed: 0,
                        failed: 0,
                    }
                    tests.push(test);
                    yield `test:enqueue - ${event.data.name}\n`;
                }
                break;
            case 'test:dequeue':
                if ((event.data.nesting === 0) && (event.data.file === undefined)) {
                    const i = testFiles.findIndex(f => f.file === event.data.name);
                    if (i >= 0) {
                        testFiles[i].isDequeued = true;
                        yield `${testFiles[i].file} dequeued\n`;
                    } else {
                        yield `${event.data.name} not found\n`;
                    }
                } else {
                    yield `test:dequeue ${event.data.name}\n`;
                }
                break;
            case 'test:start':
                idx = findTestIdxForData(tests, event.data)
                if (idx === -1) {
                    yield `no test found for ${JSON.stringify(event.data, null, 3)}`;

                } else {
                    tests[idx].isStarted = true;
                    yield `started ${tests[idx].testName}\n`;
                }
                break;           
            case 'test:pass': 
                idx = findTestIdxForData(tests, event.data);
                if (idx === -1) {
                    yield `no test found for ${JSON.stringify(event.data, null, 3)}`;

                } else {
                    tests[idx].isComplete = true;
                    tests[idx].passed++;
                    yield `passed ${tests[idx].testName}\n`;
                }
                break;
            case 'test:fail': 
                idx = findTestIdxForData(tests, event.data);
                if (idx === -1) {
                    yield `no test found for ${JSON.stringify(event.data, null, 3)}`;

                } else {
                    tests[idx].isComplete = true;
                    tests[idx].failed++;
                    yield `failed ${tests[idx].testName}\n`;
                }
                break;          
            default:
                yield `${event.type} ${event.data.name}\n`;
                break;
        }
    }
    yield getTestSummary(testFiles, tests);
}