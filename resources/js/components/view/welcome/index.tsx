import { TicketHistoryCard } from '@/components/check/ticket-history-card';
import { DeleteTicketDialog } from '@/components/input-data/delete-ticket-dialog';
import { FooterSection } from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import { TicketSuccessDialog } from '@/components/view/welcome/ticket-success-dialog';
import RelatedServices from '@/components/welcome/related-services';
import { WelcomeReportForm } from '@/components/welcome/report-form';
import { ReportingFlow } from '@/components/welcome/reporting-flow';
import { WelcomeAttachmentPreviewDialog } from '@/components/welcome/welcome-attachment-preview-dialog';
import { WelcomeBackdrop } from '@/components/welcome/welcome-backdrop';
import { WelcomeHeader } from '@/components/welcome/welcome-header';
import { WelcomeHero } from '@/components/welcome/welcome-hero';
import { useSuccessDialog } from '@/hooks/use-success-dialog';
import { useTicketHistory } from '@/hooks/use-ticket-history';
import { useWelcomeForm } from '@/hooks/use-welcome-form';
import { type WelcomePageProps } from '@/types/welcome';
import { Head, usePage } from '@inertiajs/react';
import { useEffect } from 'react';

export default function WelcomeView() {
    const { auth, flash } = usePage<WelcomePageProps>().props;

    const { data, setData, processing, errors, reset, previewFile, setPreviewFile, previewUrl, handleSubmit, removeFile } = useWelcomeForm();

    const { ticketHistory, ticketToDelete, setTicketToDelete, handleDeleteTicket, saveTicket } = useTicketHistory();

    const { showDialog, ticketNumber, copied, openSuccessDialog, handleCopy, handleDialogClose } = useSuccessDialog();

    useEffect(() => {
        if (flash?.ticket_number) {
            openSuccessDialog(flash.ticket_number);
            saveTicket(flash.ticket_number);
            reset();
        }
    }, [flash?.ticket_number, reset, openSuccessDialog, saveTicket]);

    return (
        <>
            <Head title="Selamat Datang" />
            <div className="bg-muted/30 text-foreground flex min-h-screen flex-col overflow-x-clip">
                <WelcomeHeader user={auth.user} />

                <main className="mx-auto max-w-5xl flex-1 px-4 pt-8 pb-12 sm:px-6 sm:pt-12">
                    <div className="relative isolate">
                        <WelcomeBackdrop />

                        <WelcomeHero />

                        <WelcomeReportForm
                            data={data}
                            setData={setData}
                            processing={processing}
                            errors={errors}
                            onSubmit={handleSubmit}
                            onChange={(files) => setData('attachments', files)}
                            onRemoveFile={removeFile}
                            onPreviewFile={setPreviewFile}
                        />
                    </div>

                    <TicketHistoryCard ticketHistory={ticketHistory} onSelectToDelete={setTicketToDelete} />

                    <ReportingFlow />

                    <RelatedServices />
                </main>

                <FooterSection />
            </div>

            <TicketSuccessDialog open={showDialog} ticketNumber={ticketNumber} copied={copied} onCopy={handleCopy} onClose={handleDialogClose} />

            <WelcomeAttachmentPreviewDialog file={previewFile} previewUrl={previewUrl} onClose={() => setPreviewFile(null)} />

            <DeleteTicketDialog ticket={ticketToDelete} onConfirm={handleDeleteTicket} onCancel={() => setTicketToDelete(null)} />

            <Toaster position="bottom-right" richColors />
        </>
    );
}
