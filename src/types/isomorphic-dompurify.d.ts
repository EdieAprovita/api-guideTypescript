declare module 'isomorphic-dompurify' {
    const DOMPurify: { sanitize(input: string, cfg?: Record<string, unknown>): string };
    export default DOMPurify;
}
