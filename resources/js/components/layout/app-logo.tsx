export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-md">
                {/* <AppLogoIcon className="size-5 fill-current text-white dark:text-black" /> */}
                <img src="/logo-melati.webp" alt="Logo BPS Melati" className="h-full w-full object-contain" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                {/* <span className="mb-0.5 truncate leading-none font-semibold">Melati</span> */}
                <img src="/desc-melati.webp" alt="Logo BPS" className="h-[34px] w-[88px]" />
            </div>
        </>
    );
}
