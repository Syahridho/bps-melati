import { CheckCompleteDialog } from '@/components/organisms/check/check-complete-dialog';
import { CheckConversationCard } from '@/components/organisms/check/check-conversation-card';
import { CheckGuideSection } from '@/components/organisms/check/check-guide';
import { CheckHeader } from '@/components/organisms/check/check-header';
import { CheckSearchCard } from '@/components/organisms/check/check-search-card';
import { CheckTicketSummary } from '@/components/organisms/check/check-ticket-summary';
import { FooterSection } from '@/components/templates/layout/footer';
import { AttachmentPreviewDialog, type AttachmentPreviewSource } from '@/components/molecules/attachment-preview-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Toaster } from '@/components/ui/toaster';
import { useCheckReplyForm } from '@/hooks/use-check-reply-form';
import { useCheckTicket } from '@/hooks/use-check-ticket';
import { type Attachment, type CheckPageProps } from '@/types/check';
import { Head, usePage } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, Star } from 'lucide-react';
import { useState } from 'react';

export default function CheckView() {
    const { ticketNumber, ticket, searched, flash, errors: pageErrors, ratingEnabled, rating_enabled } = usePage<CheckPageProps>().props;

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

    const [previewAttachments, setPreviewAttachments] = useState<AttachmentPreviewSource[]>([]);
    const [previewIndex, setPreviewIndex] = useState(0);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const handlePreviewAttachment = (attachment: Attachment, list: Attachment[] = []) => {
        setPreviewAttachments(list.length > 0 ? list : [attachment]);
        setPreviewIndex(0);
        setIsPreviewOpen(true);
    };

    return (
        <>
            <Head title="Cek Status Laporan / Tiket" />
            <div className="bg-background text-foreground flex min-h-screen flex-col">
                <CheckHeader />

                <main className="mx-auto w-full max-w-4xl min-w-0 flex-1 space-y-12 px-4 py-10 pb-16 sm:px-6 md:space-y-16 md:py-12 md:pb-24 lg:px-8">
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
                            <CheckTicketSummary ticket={ticket} copied={copied} onCopy={handleCopy} onPreviewAttachment={handlePreviewAttachment} />

                            {ticket.status === 'selesai' && (ticket.rating != null || (ticket.rating_comment && ticket.rating_comment.trim() !== '')) && (
                                <Card className="border-emerald-500/30 bg-emerald-500/5">
                                    <CardContent className="space-y-2 p-6">
                                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                            Terima kasih atas penilaian Anda.
                                        </p>
                                        {ticket.rating != null && (
                                            <div className="flex items-center gap-1" aria-label={`Rating ${ticket.rating} dari 5`}>
                                                {[1, 2, 3, 4, 5].map((value) => (
                                                    <Star
                                                        key={value}
                                                        className={
                                                            value <= (ticket.rating ?? 0)
                                                                ? 'h-5 w-5 fill-amber-400 text-amber-400'
                                                                : 'text-muted-foreground h-5 w-5'
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        )}
                                        {ticket.rating_comment && ticket.rating_comment.trim() !== '' && (
                                            <p className="text-muted-foreground text-sm whitespace-pre-wrap">{ticket.rating_comment}</p>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

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
                                onPreviewAttachment={handlePreviewAttachment}
                            />
                        </div>
                    )}

                    {!searched && <CheckGuideSection />}
                </main>

                <FooterSection />

                <AttachmentPreviewDialog
                    items={previewAttachments}
                    initialIndex={previewIndex}
                    open={isPreviewOpen}
                    onClose={() => setIsPreviewOpen(false)}
                    allowOpenInNewTab={false}
                />

                {ticket && (
                    <CheckCompleteDialog
                        open={isCompleteDialogOpen}
                        onOpenChange={setIsCompleteDialogOpen}
                        onConfirm={handleComplete}
                        completing={completing}
                        ticketNumber={ticket.ticket_number}
                        defaultAccessCode={ticket.access_code}
                        error={pageErrors?.access_code || pageErrors?.message}
                        ratingEnabled={ratingEnabled ?? rating_enabled ?? false}
                    />
                )}

                <Toaster position="top-right" richColors />
            </div>
        </>
    );
}
