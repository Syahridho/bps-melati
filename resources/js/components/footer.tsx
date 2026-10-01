import { ReactNode } from "react";

import { cn } from "@/lib/utils";


import {
  Footer,
  FooterBottom,
  FooterColumn,
  FooterContent,
} from "@/components/ui/footer";

interface FooterLink {
  text: string;
  href: string;
}

interface FooterColumnProps {
  title: string;
  links: FooterLink[];
}

interface FooterProps {
  logo?: ReactNode;
  name?: string;
  columns?: FooterColumnProps[];
  copyright?: string;
  policies?: FooterLink[];
  showModeToggle?: boolean;
  className?: string;
}

export default function FooterSection({
  logo = <img src="/logo-melati.webp" alt="logo melati" className="h-20 w-20" />,
  name = "Melati",
  columns = [
    {
      title: "Menu",
      links: [
        { text: "Cek Laporan", href: route('tickets.check') },
        { text: "Masuk", href: route('login') },
    ],
    },
  ],
  copyright = "©2026 Melati. All rights reserved. Power By BPS Provinsi Riau",
  className,
}: FooterProps) {
  return (
    <footer className={cn("bg-background w-full px-4", className)}>
      <div className="max-w-container mx-auto">
        <Footer>
        <FooterContent className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <FooterColumn className="col-span-2 sm:col-span-3 md:col-span-1">
              <div className="flex items-center gap-2">
                {logo}
                <div>
                    <h3 className="text-xl font-bold">{name}</h3>
                    <p className="text-xs">Monitoring Terintegrasi Laporan Aspirasi Informasi</p>
                </div>
              </div>
            </FooterColumn>
            {columns.map((column) => (
              <FooterColumn key={column.title}>
                <h3 className="text-md pt-1 font-semibold">{column.title}</h3>
                {column.links.map((link) => (
                  <a
                    key={`${link.href}-${link.text}`}
                    href={link.href}
                    className="text-muted-foreground text-sm"
                  >
                    {link.text}
                  </a>
                ))}
              </FooterColumn>
            ))}
          </FooterContent>
          <FooterBottom className="sm:justify-center">
            <div className="text-center">{copyright}</div>
          </FooterBottom>
        </Footer>
      </div>
    </footer>
  );
}
