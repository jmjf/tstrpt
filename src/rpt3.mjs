// reports details of event content for all test events

export default async function* rpt3(source) {
    for await (const event of source) {
        let msg = `${event.type.toUpperCase()}\n${JSON.stringify(event, null, 3)}\n\n`;
        if (event.type === 'test:fail') {
            for (const [key, value] of Object.entries(event.data.details.error)) {
                msg += `error.${key}: ${typeof value} = ${value}\n`;
            }
            const cause = event.data.details.error.cause
            for (const [key, value] of Object.entries(cause)) {
                msg += `error.cause.${key}: ${typeof value} = ${value}\n`;
            }
            
            if (cause.matcherResult) {
                for (const [key, value] of Object.entries(cause.matcherResult)) {
                    msg += `error.cause.matcherResult.${key}: ${typeof value} = ${value}\n`;
                }
            }
            if (cause.stack && cause.matcherResult) {
                const matcherMsgLen = cause.matcherResult.message.length;
                const stack = cause.stack.slice(7 + matcherMsgLen + 1);
                msg += `${matcherMsgLen} - error.cause.stack -> ${stack}\n`;
                const stackLine = stack.split('\n')[0];
                msg += `stackLine -> ${stackLine}\n`;
            }

            if (event.data.details.error.stack) {
                msg += `error.stack -> ${event.data.details.error.stack}\n`;
            }
        }

        yield msg
    }
}