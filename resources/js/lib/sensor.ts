export const defaultMatchTypeHint = (word: string): string => {
    const isLong = word.length >= 5;
    return isLong
        ? 'Kata 5 huruf atau lebih default menggunakan mode "Di mana saja" (cocok di seluruh teks).'
        : 'Kata 4 huruf atau kurang default menggunakan mode "Kata utuh" (hanya cocok sebagai kata tersendiri).';
};
