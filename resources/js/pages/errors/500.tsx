import ErrorPage from '../error';

export default function Error500({ message }: { message?: string }) {
    return <ErrorPage status={500} message={message} />;
}
