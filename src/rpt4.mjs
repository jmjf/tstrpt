// reports details of event content for all test events
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function toPlaces(x, places) {
    return Math.round(x*(10^places))/(10^places);
}

export default async function* rpt4(source) {
    for await (const event of source) {
        switch (event.type) {
            case 'test:pass':
                yield `${'   '.repeat(event.data.nesting)}PASS - ${event.data.name} - (${toPlaces(event.data.details.duration_ms, 2)} ms)\n`;
                break;

            case 'test:fail':
                const details = event.data.details;
                let msg = `${'   '.repeat(event.data.nesting)}FAIL - ${event.data.name} - (${toPlaces(details.duration_ms, 2)} ms)\n`;
                if (details.error.failureType === 'testCodeFailure') {
                    const cause = details.error.cause;
                    const stack = cause.stack.slice(7 + cause.matcherResult.message.length + 1);
                    const causeLine = `${'   '.repeat(event.data.nesting)}${stack.split('\n')[0].trim()}`;
                    const causeMsg = cause.matcherResult.message.split('\n')
                        .map((line, idx, arr) => `${'  '.repeat(event.data.nesting + 3)}${line}`)
                        .join('\n');
                    msg = msg + `${causeLine}\n${causeMsg}\n`;
                }
                yield msg;
                break;

            case 'test:start':
                if (event.data.nesting === 0) {
                    const file = (!!event.data.file ? ` (${path.basename(fileURLToPath(event.data.file))})\n` : '');
                    yield `${file.length > 0 ? 'RUN ' : ''}${event.data.name}${file}`;
                }
                break;

            // default:
            //     yield `${event.type.toUpperCase()}\n${JSON.stringify(event, null, 3)}\n\n`;
            //     break;
        }
    }
}