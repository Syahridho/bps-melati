import { CheckCompleteDialog } from '@/components/check-complete-dialog';
import { CheckConversationCard } from '@/components/check-conversation-card';
import { CheckHeader } from '@/components/check-header';
import { CheckSearchCard } from '@/components/check-search-card';
import { CheckTicketSummary } from '@/components/check-ticket-summary';
import { Card, CardContent } from '@/components/ui/card';
import { useCheckReplyForm } from '@/hooks/use-check-reply-form';
import { useCheckTicket } from '@/hooks/use-check-ticket';
import { type CheckPageProps } from '@/types/check';
import { Head, usePage } from '@inertiajs/react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function CheckTicket() {
    const { ticketNumber, ticket, searched, flash, errors: pageErrors } = usePage<CheckPageProps>().props;

    const {
        inputQuery,
        setInputQuery,
        handleSearch,
        copied,
        handleCopy,
        successMessage,
        completing,
        isCompleteDialogOpen,
        setIsCompleteDialogOpen,
        handleComplete,
    } = useCheckTicket(ticketNumber, ticket, flash?.success);

    const {
        showReplyForm,
        setShowReplyForm,
        fileInputRef,
        data: replyData,
        setData: setReplyData,
        processing: replyProcessing,
        errors: replyErrors,
        handleFileChange,
        handleRemoveFile,
        handleSendReply,
    } = useCheckReplyForm(ticket);

    return (
        <>
            <Head title="Cek Status Laporan / Tiket" />
            <div className="bg-background text-foreground min-h-screen">
                <CheckHeader />

                <main className="mx-auto max-w-4xl space-y-8 px-6 py-10">
                    <CheckSearchCard inputQuery={inputQuery} onInputChange={setInputQuery} onSubmit={handleSearch} />

                    {/* Global Flash / Notification */}
                    {successMessage && (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-5 w-5 shrink-0" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {pageErrors?.message && (
                        <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            <span>{pageErrors.message}</span>
                        </div>
                    )}

                    {/* Result Section */}
                    {searched && !ticket && (
                        <Card className="border-destructive/30 bg-destructive/5 text-destructive border">
                            <CardContent className="flex items-start gap-4 p-6">
                                <AlertCircle className="mt-0.5 h-6 w-6 shrink-0" />
                                <div className="space-y-1">
                                    <h3 className="text-base font-semibold">Tiket Tidak Ditemukan</h3>
                                    <p className="text-sm opacity-90">
                                        Nomor tiket <strong className="font-mono">{ticketNumber}</strong> tidak ditemukan di sistem. Harap periksa
                                        kembali penulisan nomor tiket Anda.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {searched && ticket && (
                        <div className="space-y-6">
                            <CheckTicketSummary ticket={ticket} copied={copied} onCopy={handleCopy} />

                            <CheckConversationCard
                                ticket={ticket}
                                completing={completing}
                                onOpenCompleteDialog={() => setIsCompleteDialogOpen(true)}
                                showReplyForm={showReplyForm}
                                onOpenReplyForm={() => setShowReplyForm(true)}
                                onCloseReplyForm={() => setShowReplyForm(false)}
                                replyData={replyData}
                                setReplyData={setReplyData}
                                replyProcessing={replyProcessing}
                                replyErrors={replyErrors}
                                fileInputRef={fileInputRef}
                                onFileChange={handleFileChange}
                                onRemoveFile={handleRemoveFile}
                                onSubmitReply={handleSendReply}
                            />
                        </div>
                    )}
                </main>
            </div>

            <CheckCompleteDialog
                open={isCompleteDialogOpen}
                onOpenChange={setIsCompleteDialogOpen}
                completing={completing}
                onConfirm={handleComplete}
            />
        </>
    );
}
