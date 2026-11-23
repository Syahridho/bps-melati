export function ErrorBox({ message }: { message: string }) {
    return <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm">{message}</div>;
}
