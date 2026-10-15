<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Daftar local-part yang dianggap placeholder / jelas palsu
    |--------------------------------------------------------------------------
    |
    | Alamat email dengan local-part (bagian sebelum @) yang cocok persis
    | dengan salah satu entri di bawah akan ditolak oleh rule
    | NotPlaceholderEmail. Case-insensitive.
    |
    */

    'blocked_local_parts' => [
        'a', 'aa', 'aaa', 'aaaa',
        'abc', 'abcd', 'abcde', 'abcdef',
        'asd', 'asdf', 'asdfg', 'asdfgh', 'asdfghjkl',
        'qwe', 'qwer', 'qwert', 'qwerty',
        'zxc', 'zxcv',
        'test', 'tes', 'testing',
        'xxx', 'xxxx',
        'dummy', 'fake', 'none', 'noemail', 'no',
        'admin', 'root', 'user', 'email',
        '123', '1234', '12345',
    ],

    /*
    |--------------------------------------------------------------------------
    | Domain yang dipakai contoh / placeholder
    |--------------------------------------------------------------------------
    */

    'blocked_domains' => [
        'example.com',
        'example.org',
        'example.net',
        'test.com',
        'test.org',
        'test.net',
        'localhost',
        'mailinator.com',
        'guerrillamail.com',
        'yopmail.com',
        'tempmail.com',
        'throwaway.email',
    ],

];
