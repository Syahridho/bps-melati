import { AlertBanner } from '@/components/molecules/alert-banner';
import { AttachmentPreviewDialog } from '@/components/molecules/attachment-preview-dialog';
import { CheckConversationCard } from '@/components/organisms/check/check-conversation-card';
import { CheckGuideSection } from '@/components/organisms/check/check-guide';
import { CheckHeader } from '@/components/organisms/check/check-header';
import { CheckNotFound } from '@/components/organisms/check/check-not-found';

import { CheckRatingSummary } from '@/components/organisms/check/check-rating-summary';
import { CheckSearchCard } from '@/components/organisms/check/check-search-card';
import { CheckTicketSummary } from '@/components/organisms/check/check-ticket-summary';
import { FooterSection } from '@/components/templates/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import { useAttachmentPreview } from '@/hooks/use-attachment-preview';
import { useCheckReplyForm } from '@/hooks/use-check-reply-form';
import { useCheckTicket } from '@/hooks/use-check-ticket';
import { hasRatingFeedback } from '@/lib/rating';
import { type CheckPageProps } from '@/types/check';
import { Head, usePage } from '@inertiajs/react';
import { CheckCompleteDialog } from './check-complate-dialog';

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

    const attachmentPreview = useAttachmentPreview();

    return (
        <>
            <Head title="Cek Status Laporan / Tiket" />
            <div className="bg-background text-foreground flex min-h-screen flex-col">
                <CheckHeader />

                <main className="mx-auto w-full max-w-4xl min-w-0 flex-1 space-y-12 px-4 py-10 pb-16 sm:px-6 md:space-y-16 md:py-12 md:pb-24 lg:px-8">
                    <CheckSearchCard inputQuery={inputQuery} onInputChange={setInputQuery} onSubmit={handleSearch} />

                    {successMessage && <AlertBanner variant="success" message={successMessage} />}
                    {pageErrors?.message && <AlertBanner variant="error" message={pageErrors.message} />}

                    {searched && !ticket && <CheckNotFound ticketNumber={ticketNumber} />}

                    {searched && ticket && (
                        <div className="space-y-6">
                            <CheckTicketSummary ticket={ticket} copied={copied} onCopy={handleCopy} onPreviewAttachment={attachmentPreview.preview} />

                            {ticket.status === 'selesai' && hasRatingFeedback(ticket) && (
                                <CheckRatingSummary rating={ticket.rating} comment={ticket.rating_comment} />
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
                                onPreviewAttachment={attachmentPreview.preview}
                            />
                        </div>
                    )}

                    {!searched && <CheckGuideSection />}
                </main>

                <FooterSection />

                <AttachmentPreviewDialog
                    items={attachmentPreview.items}
                    initialIndex={attachmentPreview.index}
                    open={attachmentPreview.open}
                    onClose={attachmentPreview.close}
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
