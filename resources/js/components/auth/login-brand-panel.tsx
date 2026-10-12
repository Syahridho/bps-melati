export function LoginBrandPanel() {
    return (
        <div className="from-primary/10 via-primary/5 dark:from-primary/20 dark:via-primary/10 relative hidden bg-gradient-to-br to-transparent md:flex md:flex-col md:items-center md:justify-center dark:to-transparent">
            <div className="relative flex flex-col items-center justify-center">
                {/* Logo utama di tengah */}
                <img src="/melati_big.webp" alt="Logo" className="-mt-16 h-44 w-44 object-contain drop-shadow-lg dark:brightness-90" />

                {/* Logo teks di bawahnya dengan absolute yang terukur */}
                <img
                    src="/desc-melati.webp"
                    alt="Logo Desc"
                    className="absolute -bottom-20 h-28 w-auto object-contain drop-shadow-md dark:brightness-90"
                />
            </div>
        </div>
    );
}
