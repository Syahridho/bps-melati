import { AlurPelaporan } from '@/components/alur-pelaporan';
import { DeleteTicketDialog } from '@/components/delete-ticket-dialog';
import FooterSection from '@/components/footer';
import { PublicStatsSection } from '@/components/public-stats';
import { ReportForm } from '@/components/report-form';
import { TicketHistoryCard } from '@/components/ticket-history-card';
import { TicketSuccessDialog } from '@/components/ticket-success-dialog';
import { WelcomeAttachmentPreviewDialog } from '@/components/welcome-attachment-preview-dialog';
import { WelcomeHeader } from '@/components/welcome-header';
import { WelcomeHero } from '@/components/welcome-hero';
import { useSuccessDialog } from '@/hooks/use-success-dialog';
import { useTicketHistory } from '@/hooks/use-ticket-history';
import { useWelcomeForm } from '@/hooks/use-welcome-form';
import { type WelcomePageProps } from '@/types/welcome';
import { Head, usePage } from '@inertiajs/react';
import { useEffect } from 'react';

export default function Welcome() {
    const { auth, flash, stats } = usePage<WelcomePageProps>().props;

    const {
        data,
        setData,
        processing,
        errors,
        reset,
        fileInputRef,
        previewFile,
        setPreviewFile,
        previewUrl,
        handleSubmit,
        handleFileChange,
        removeFile,
    } = useWelcomeForm();

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
            <div className="bg-muted/30 text-foreground min-h-screen overflow-x-clip">
                <WelcomeHeader user={auth.user} />

                <main className="mx-auto max-w-5xl px-4 pt-8 pb-0 sm:px-6 sm:pt-12">
                    <WelcomeHero />

                    <ReportForm
                        data={data}
                        setData={setData}
                        processing={processing}
                        errors={errors}
                        fileInputRef={fileInputRef}
                        onSubmit={handleSubmit}
                        onFileChange={handleFileChange}
                        onRemoveFile={removeFile}
                        onPreviewFile={setPreviewFile}
                    />

                    <TicketHistoryCard ticketHistory={ticketHistory} onSelectToDelete={setTicketToDelete} />

                    <AlurPelaporan />

                    <PublicStatsSection stats={stats} />

                    <FooterSection />
                </main>
            </div>

            <TicketSuccessDialog open={showDialog} ticketNumber={ticketNumber} copied={copied} onCopy={handleCopy} onClose={handleDialogClose} />

            <WelcomeAttachmentPreviewDialog file={previewFile} previewUrl={previewUrl} onClose={() => setPreviewFile(null)} />

            <DeleteTicketDialog ticket={ticketToDelete} onConfirm={handleDeleteTicket} onCancel={() => setTicketToDelete(null)} />
        </>
    );
}
