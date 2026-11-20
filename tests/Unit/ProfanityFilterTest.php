<?php

use App\Support\ProfanityFilter;

test('censor mempertahankan huruf pertama dan mengganti sisanya dengan bintang', function () {
    $filter = new ProfanityFilter([
        ['word' => 'anjing', 'match_type' => 'anywhere'],
        ['word' => 'bangsat', 'match_type' => 'anywhere'],
    ], [], '*');

    expect($filter->censor('Anjing'))->toBe('A*****');
    expect($filter->censor('anjiiing'))->toBe('a*******');
    expect($filter->censor('4nj1ng'))->toBe('4*****');
    expect($filter->censor('Bangsat'))->toBe('B******');
});

test('censor kata yang menempel tersensor semua', function () {
    $filter = new ProfanityFilter([
        ['word' => 'anjing', 'match_type' => 'anywhere'],
        ['word' => 'bangsat', 'match_type' => 'anywhere'],
    ], [], '*');

    expect($filter->censor('AnjingAnjing'))->toBe('A*****A*****');
    expect($filter->censor('AnjingAnjingAnjingAnjing'))->toBe('A*****A*****A*****A*****');
    expect($filter->censor('BangsatBangsat'))->toBe('B******B******');
});

test('censor tidak menghasilkan false positive pada kata aman', function () {
    $filter = new ProfanityFilter([
        ['word' => 'anjing', 'match_type' => 'anywhere'],
        ['word' => 'bangsat', 'match_type' => 'anywhere'],
    ], [], '*');

    expect($filter->censor('asumsi'))->toBe('asumsi');
    expect($filter->censor('babilonia'))->toBe('babilonia');
    expect($filter->censor('selamat pagi dunia'))->toBe('selamat pagi dunia');
});

test('contains bernilai false untuk teks bersih', function () {
    $filter = new ProfanityFilter([
        ['word' => 'anjing', 'match_type' => 'anywhere'],
    ], [], '*');

    expect($filter->contains('selamat pagi'))->toBeFalse();
    expect($filter->contains(''))->toBeFalse();
});

test('censor aman untuk teks kosong dan null', function () {
    $filter = new ProfanityFilter([
        ['word' => 'anjing', 'match_type' => 'anywhere'],
    ], [], '*');

    expect($filter->censor(''))->toBe('');
    expect($filter->censor(null))->toBeNull();
});

test('kata pendek hanya cocok sebagai kata utuh, bukan sebagai bagian kata lain', function () {
    $filter = new ProfanityFilter([
        ['word' => 'asu', 'match_type' => 'whole_word'],
        ['word' => 'tai', 'match_type' => 'whole_word'],
    ], [], '*');

    // 'asu' dalam 'asumsi' tidak boleh cocok (kata pendek butuh batas kata)
    expect($filter->censor('asumsi'))->toBe('asumsi');
    // 'tai' dalam 'babilonia' tidak boleh cocok
    expect($filter->censor('babilonia'))->toBe('babilonia');
    // 'asu' sebagai kata utuh boleh cocok (a + 2 bintang = a**)
    expect($filter->censor('asu itu kasar'))->toBe('a** itu kasar');
});

test('kata panjang cocok di mana saja termasuk yang menempel', function () {
    $filter = new ProfanityFilter([
        ['word' => 'anjing', 'match_type' => 'anywhere'],
    ], [], '*');

    expect($filter->censor('menganjing'))->toBe('menga*****');
    expect($filter->contains('menganjing'))->toBeTrue();
});

test('cache pola regex tersimpan di static property', function () {
    $filter = new ProfanityFilter([
        ['word' => 'anjing', 'match_type' => 'anywhere'],
        ['word' => 'bangsat', 'match_type' => 'anywhere'],
    ], [], '*');

    $filter->censor('anjing');
    $filter->censor('bangsat');

    $reflection = new ReflectionClass($filter);
    $cache = $reflection->getProperty('patternCache');
    $value = $cache->getValue($filter);

    expect($value)->toHaveKey('anjing:anywhere');
    expect($value)->toHaveKey('bangsat:anywhere');
});

test('clean statis mengembalikan null untuk input null', function () {
    expect(ProfanityFilter::clean(null))->toBeNull();
});
