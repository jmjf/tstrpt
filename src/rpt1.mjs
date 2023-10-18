// reports details of event content for all test events

export default async function* customReporter(source) {
    for await (const event of source) {
        yield `${event.type.toUpperCase()}\n${JSON.stringify(event, null, 3)}\n\n`;
        
    }
}