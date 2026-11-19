import { SERVICE_CARDS, ServiceCard } from './service-cards';

export default function RelatedServices() {
    return (
        <section aria-labelledby="service-cards-title" className="mx-auto mt-10 w-full max-w-4xl px-4 py-6 sm:px-6 md:mt-12 md:py-8 lg:px-8">
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
    );
}
