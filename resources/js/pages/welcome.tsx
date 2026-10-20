import { AlurPelaporan } from '@/components/alur-pelaporan';
import { BpsFooter } from '@/components/bps-footer';
import { DeleteTicketDialog } from '@/components/delete-ticket-dialog';
// import { FloatingServiceLinks } from '@/components/floating-service-links';
import { ReportForm } from '@/components/report-form';
import { SERVICE_CARDS, ServiceCard } from '@/components/service-cards';
import { TicketHistoryCard } from '@/components/ticket-history-card';
import { TicketSuccessDialog } from '@/components/ticket-success-dialog';
import { Toaster } from '@/components/ui/toaster';
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
    const { auth, flash } = usePage<WelcomePageProps>().props;

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
            <div className="bg-muted/30 text-foreground flex min-h-screen flex-col overflow-x-clip">
                <WelcomeHeader user={auth.user} />

                <main className="mx-auto max-w-5xl flex-1 px-4 pt-8 pb-12 sm:px-6 sm:pt-12">
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

                    <section
                        aria-labelledby="service-cards-title"
                        className="mx-auto mt-10 w-full max-w-4xl px-4 py-6 sm:px-6 md:mt-12 md:py-8 lg:px-8"
                    >
                        <div className="mb-8 text-center">
                            <h2 id="service-cards-title" className="text-2xl font-bold tracking-tight md:text-[1.75rem]">
                                Layanan Terkait
                            </h2>
                            <p className="text-muted-foreground mt-2 text-sm md:text-base">Saluran pengaduan dan layanan resmi lainnya.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                            {SERVICE_CARDS.map((card) => (
                                <ServiceCard
                                    key={card.titleLine1}
                                    icon={card.icon}
                                    titleLine1={card.titleLine1}
                                    titleLine2={card.titleLine2}
                                    description={card.description}
                                    linkText={card.linkText}
                                    href={card.href}
                                    external={card.external}
                                />
                            ))}
                        </div>
                    </section>

                    {/* <PublicStatsSection stats={stats} /> */}
                </main>

                <BpsFooter />
            </div>

            <TicketSuccessDialog open={showDialog} ticketNumber={ticketNumber} copied={copied} onCopy={handleCopy} onClose={handleDialogClose} />

            <WelcomeAttachmentPreviewDialog file={previewFile} previewUrl={previewUrl} onClose={() => setPreviewFile(null)} />

            <DeleteTicketDialog ticket={ticketToDelete} onConfirm={handleDeleteTicket} onCancel={() => setTicketToDelete(null)} />

            {/* logo wbs dan lapor.go.id */}
            {/* <FloatingServiceLinks /> */}

            <Toaster position="bottom-right" closeButton richColors />
        </>
    );
}
