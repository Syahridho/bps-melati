/**
 * Definisi dokumentasi API untuk halaman /settings/api.
 *
 * Semua data diambil langsung dari kode asli (routes/api.php, controller,
 * FormRequest, middleware, dan AppServiceProvider). Tidak ada data yang diarang.
 * Nilai API key TIDAK termasuk di sini; contoh hanya memakai placeholder
 * `YOUR_API_KEY` dan `BASE_URL`.
 */

export type ApiAuth = 'api-key' | 'bearer' | 'none';

export type ApiParamLocation = 'path' | 'query' | 'body' | 'header';

export interface ApiParam {
    name: string;
    location: ApiParamLocation;
    type: string;
    required: boolean;
    description: string;
    example?: string;
    enum?: string[];
}

export interface ApiExample {
    statusCode: number;
    description: string;
    body: string;
}

export interface ApiCodeExample {
    label: string;
    code: string;
}

export interface ApiEndpoint {
    id: string;
    method: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';
    path: string;
    title: string;
    description: string;
    auth: ApiAuth;
    rateLimit?: string;
    params: ApiParam[];
    success: ApiExample;
    errors: ApiExample[];
    codeExamples: ApiCodeExample[];
}

/** Basis URL yang akan diisi dari props Inertia (config APP_URL + /api). */
export const BASE_URL_PLACEHOLDER = 'BASE_URL';

/** Placeholder untuk API key. Nilai asli TIDAK disimpan di sini. */
export const API_KEY_PLACEHOLDER = 'YOUR_API_KEY';

/**
 * Data semua endpoint API.
 */
export const API_ENDPOINTS: ApiEndpoint[] = [
    {
        id: 'auth-token-store',
        method: 'POST',
        path: '/api/auth/token',
        title: 'Masuk (Login) Mobile',
        description:
            'Mendapatkan token Bearer untuk klien non-browser (Flutter/Android). ' +
            'Login mobile baru mencabut token mobile lama dengan nama perangkat yang sama. ' +
            'Token web (sesi) dan token mobile tidak saling meniadakan.',
        auth: 'none',
        rateLimit: '10 request per menit (per email + IP)',
        params: [
            {
                name: 'email',
                location: 'body',
                type: 'string',
                required: true,
                description: 'Alamat email pelanggan.',
                example: 'pelapor@example.com',
            },
            {
                name: 'password',
                location: 'body',
                type: 'string',
                required: true,
                description: 'Kata sandi akun.',
                example: 'sandi123',
            },
            {
                name: 'device_name',
                location: 'body',
                type: 'string',
                required: false,
                description: 'Nama perangkat (maksimal 100 karakter).',
                example: 'HP Android Kantor',
            },
        ],
        success: {
            statusCode: 201,
            description: 'Berhasil masuk.',
            body: JSON.stringify(
                {
                    message: 'Berhasil masuk.',
                    code: 'ok',
                    data: {
                        token: 'eyJ0eXAiOi...',
                        token_type: 'Bearer',
                        expires_at: '2026-11-14T07:00:00+07:00',
                        user: {
                            id: 1,
                            name: 'Administrator',
                            email: 'admin@example.com',
                            role: 'admin',
                        },
                    },
                },
                null,
                2,
            ),
        },
        errors: [
            {
                statusCode: 401,
                description: 'Kredensial salah.',
                body: JSON.stringify({ message: 'Kredensial yang Anda masukkan salah.', code: 'invalid_credentials' }, null, 2),
            },
            {
                statusCode: 403,
                description: 'Akun dinonaktifkan.',
                body: JSON.stringify({ message: 'Akun Anda dinonaktifkan.', code: 'account_disabled' }, null, 2),
            },
            {
                statusCode: 409,
                description: 'Akun sedang digunakan.',
                body: JSON.stringify({ message: 'Akun sedang digunakan.', code: 'account_in_use' }, null, 2),
            },
            {
                statusCode: 422,
                description: 'Validasi gagal.',
                body: JSON.stringify({ message: 'Email wajib diisi.', code: 'validation_error' }, null, 2),
            },
            {
                statusCode: 429,
                description: 'Terlalu banyak request.',
                body: JSON.stringify(
                    {
                        message: 'Terlalu banyak percobaan login. Coba lagi dalam 60 detik.',
                        code: 'throttled',
                        retry_after: 60,
                    },
                    null,
                    2,
                ),
            },
        ],
        codeExamples: [
            {
                label: 'cURL',
                code: `curl -X POST ${BASE_URL_PLACEHOLDER}/api/auth/token \\\n  -H "Content-Type: application/json" \\\n  -d '{"email":"pelapor@example.com","password":"sandi123","device_name":"HP Android"}'`,
            },
            {
                label: 'JavaScript (fetch)',
                code: `fetch('${BASE_URL_PLACEHOLDER}/api/auth/token', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({\n    email: 'pelapor@example.com',\n    password: 'sandi123',\n    device_name: 'HP Android'\n  })\n})\n  .then(r => r.json())\n  .then(data => console.log(data.data.token));`,
            },
            {
                label: 'PHP (Laravel Http)',
                code: `use Illuminate\\Support\\Facades\\Http;\n\n$response = Http::post('${BASE_URL_PLACEHOLDER}/api/auth/token', [\n  'email' => 'pelapor@example.com',\n  'password' => 'sandi123',\n  'device_name' => 'HP Android',\n]);\n\n$token = $response->json('data.token');`,
            },
            {
                label: 'Dart/Flutter (http)',
                code: `import 'package:http/http.dart' as http;\nimport 'dart:convert';\n\nfinal response = await http.post(\n  Uri.parse('${BASE_URL_PLACEHOLDER}/api/auth/token'),\n  headers: { 'Content-Type': 'application/json' },\n  body: jsonEncode({\n    email: 'pelapor@example.com',\n    password: 'sandi123',\n    device_name: 'HP Android',\n  }),\n);\nfinal data = jsonDecode(response.body);\nfinal token = data['data']['token'];`,
            },
        ],
    },
    {
        id: 'auth-token-destroy',
        method: 'DELETE',
        path: '/api/auth/token',
        title: 'Keluar (Logout) Mobile',
        description: 'Mencabut token Bearer milik akun yang sedang login. Digunakan oleh klien mobile saat logout.',
        auth: 'bearer',
        params: [],
        success: {
            statusCode: 200,
            description: 'Token berhasil dicabut.',
            body: JSON.stringify({ message: 'Token berhasil dicabut.', code: 'ok' }, null, 2),
        },
        errors: [
            {
                statusCode: 401,
                description: 'Tidak terautentikasi.',
                body: JSON.stringify({ message: 'Unauthenticated.', code: 'unauthenticated' }, null, 2),
            },
        ],
        codeExamples: [
            {
                label: 'cURL',
                code: `curl -X DELETE ${BASE_URL_PLACEHOLDER}/api/auth/token \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json"`,
            },
            {
                label: 'JavaScript (fetch)',
                code: `fetch('${BASE_URL_PLACEHOLDER}/api/auth/token', {\n  method: 'DELETE',\n  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }\n})\n  .then(r => r.json());`,
            },
            {
                label: 'PHP (Laravel Http)',
                code: `$response = Http::withToken('YOUR_API_KEY')\n  ->delete('${BASE_URL_PLACEHOLDER}/api/auth/token');`,
            },
            {
                label: 'Dart/Flutter (http)',
                code: `final response = await http.delete(\n  Uri.parse('${BASE_URL_PLACEHOLDER}/api/auth/token'),\n  headers: { 'Authorization': 'Bearer YOUR_API_KEY' },\n);`,
            },
        ],
    },
    {
        id: 'auth-user',
        method: 'GET',
        path: '/api/user',
        title: 'Profil Pengguna Saat Ini',
        description: 'Mengembalikan data pengguna yang sedang login berdasarkan token Bearer.',
        auth: 'bearer',
        params: [],
        success: {
            statusCode: 200,
            description: 'Data pengguna.',
            body: JSON.stringify(
                {
                    id: 1,
                    name: 'Administrator',
                    email: 'admin@example.com',
                    role: 'admin',
                    avatar: null,
                    email_verified_at: null,
                    created_at: '2026-11-01T00:00:00+07:00',
                    updated_at: '2026-11-01T00:00:00+07:00',
                },
                null,
                2,
            ),
        },
        errors: [
            {
                statusCode: 401,
                description: 'Tidak terautentikasi.',
                body: JSON.stringify({ message: 'Unauthenticated.', code: 'unauthenticated' }, null, 2),
            },
        ],
        codeExamples: [
            {
                label: 'cURL',
                code: `curl -X GET ${BASE_URL_PLACEHOLDER}/api/user \\\n  -H "Authorization: Bearer YOUR_API_KEY"`,
            },
            {
                label: 'JavaScript (fetch)',
                code: `fetch('${BASE_URL_PLACEHOLDER}/api/user', {\n  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }\n})\n  .then(r => r.json());`,
            },
            {
                label: 'PHP (Laravel Http)',
                code: `$response = Http::withToken('YOUR_API_KEY')\n  ->get('${BASE_URL_PLACEHOLDER}/api/user');`,
            },
            {
                label: 'Dart/Flutter (http)',
                code: `final response = await http.get(\n  Uri.parse('${BASE_URL_PLACEHOLDER}/api/user'),\n  headers: { 'Authorization': 'Bearer YOUR_API_KEY' },\n);`,
            },
        ],
    },
    {
        id: 'tickets-store',
        method: 'POST',
        path: '/api/tickets',
        title: 'Buat Tiket Baru',
        description:
            'Membuat tiket pengaduan, aspirasi, atau permintaan informasi dari aplikasi klien. ' +
            'Membutuhkan header API key yang valid.',
        auth: 'api-key',
        rateLimit: '5 request per menit (per IP)',
        params: [
            {
                name: 'X-API-KEY',
                location: 'header',
                type: 'string',
                required: true,
                description: 'API key aplikasi.',
                example: 'YOUR_API_KEY',
            },
            {
                name: 'classification',
                location: 'body',
                type: 'string',
                required: true,
                description: 'Klasifikasi laporan.',
                enum: ['pengaduan', 'aspirasi', 'permintaan_informasi'],
                example: 'pengaduan',
            },
            {
                name: 'title',
                location: 'body',
                type: 'string',
                required: true,
                description: 'Judul laporan (minimal 3, maksimal 255 karakter).',
                example: 'Jalan rusak di depan kantor',
            },
            {
                name: 'channel_id',
                location: 'body',
                type: 'integer',
                required: true,
                description: 'ID kanal laporan (harus ada dan aktif).',
                example: '1',
            },
            {
                name: 'reporter_name',
                location: 'body',
                type: 'string',
                required: false,
                description: 'Nama pelapor (maksimal 255 karakter).',
                example: 'Budi',
            },
            {
                name: 'reporter_email',
                location: 'body',
                type: 'string',
                required: false,
                description: 'Email pelapor (maksimal 255 karakter).',
                example: 'budi@example.com',
            },
            {
                name: 'reporter_wa',
                location: 'body',
                type: 'string',
                required: false,
                description: 'Nomor WhatsApp pelapor (hanya digit, maksimal 30 karakter).',
                example: '081234567890',
            },
            {
                name: 'content',
                location: 'body',
                type: 'string',
                required: true,
                description: 'Isi uraian laporan (minimal 10 karakter).',
                example: 'Jalan di depan kantor sudah berlubang parah.',
            },
            {
                name: 'service_type',
                location: 'body',
                type: 'string',
                required: false,
                description: 'Jenis layanan (pst | lainnya).',
                enum: ['pst', 'lainnya'],
                example: 'pst',
            },
            {
                name: 'satuan_tugas',
                location: 'body',
                type: 'string',
                required: false,
                description: 'Satuan tugas (maksimal 255 karakter).',
                example: 'PUPR',
            },
            {
                name: 'source_app',
                location: 'body',
                type: 'string',
                required: false,
                description: 'Nama aplikasi sumber (maksimal 20 karakter).',
                example: 'flutter',
            },
            {
                name: 'attachments',
                location: 'body',
                type: 'file[]',
                required: false,
                description: 'Lampiran maksimal 3 file (jpg, jpeg, png, pdf, maksimal 2MB per file).',
            },
        ],
        success: {
            statusCode: 201,
            description: 'Tiket berhasil dibuat.',
            body: JSON.stringify(
                {
                    success: true,
                    message: 'Tiket berhasil dibuat.',
                    data: {
                        id: 1001,
                        ticket_number: 'L-1400/112026/0001',
                        access_code: 'AbCd12',
                        classification: 'pengaduan',
                        title: 'Jalan rusak di depan kantor',
                        status: 'baru',
                        created_at: '2026-11-07T21:00:00+07:00',
                        attachments: [],
                    },
                },
                null,
                2,
            ),
        },
        errors: [
            {
                statusCode: 400,
                description: 'Permintaan tidak valid.',
                body: JSON.stringify({ success: false, message: 'Parameter tidak valid.' }, null, 2),
            },
            {
                statusCode: 401,
                description: 'API key tidak valid atau hilang.',
                body: JSON.stringify(
                    { success: false, message: 'Unauthorized. Invalid or missing API key.' },
                    null,
                    2,
                ),
            },
            {
                statusCode: 422,
                description: 'Validasi gagal.',
                body: JSON.stringify(
                    { success: false, message: 'Validasi gagal.', errors: { title: ['Judul laporan wajib diisi.'] } },
                    null,
                    2,
                ),
            },
            {
                statusCode: 429,
                description: 'Terlalu banyak request.',
                body: JSON.stringify({ message: 'Terlalu banyak request.', code: 'throttled' }, null, 2),
            },
        ],
        codeExamples: [
            {
                label: 'cURL',
                code: `curl -X POST ${BASE_URL_PLACEHOLDER}/api/tickets \\\n  -H "X-API-KEY: YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"classification":"pengaduan","title":"Jalan rusak","channel_id":"1","content":"Jalan berlubang parah"}'`,
            },
            {
                label: 'JavaScript (fetch)',
                code: `const form = new FormData();\nform.append('classification', 'pengaduan');\nform.append('title', 'Jalan rusak');\nform.append('channel_id', '1');\nform.append('content', 'Jalan berlubang parah');\n\nfetch('${BASE_URL_PLACEHOLDER}/api/tickets', {\n  method: 'POST',\n  headers: { 'X-API-KEY': 'YOUR_API_KEY' },\n  body: form,\n}).then(r => r.json());`,
            },
            {
                label: 'PHP (Laravel Http)',
                code: `$response = Http::withHeaders([\n  'X-API-KEY' => 'YOUR_API_KEY',\n])\n  ->post('${BASE_URL_PLACEHOLDER}/api/tickets', [\n    'classification' => 'pengaduan',\n    'title' => 'Jalan rusak',\n    'channel_id' => 1,\n    'content' => 'Jalan berlubang parah',\n  ]);`,
            },
            {
                label: 'Dart/Flutter (http)',
                code: `final response = await http.post(\n  Uri.parse('${BASE_URL_PLACEHOLDER}/api/tickets'),\n  headers: { 'X-API-KEY': 'YOUR_API_KEY' },\n  body: {\n    classification: 'pengaduan',\n    title: 'Jalan rusak',\n    channel_id: '1',\n    content: 'Jalan berlubang parah',\n  },\n);`,
            },
        ],
    },
    {
        id: 'tickets-check-query',
        method: 'GET',
        path: '/api/check',
        title: 'Cek Tiket (Query Parameter)',
        description:
            'Memeriksa status tiket menggunakan query parameter `ticket_number`. ' +
            'Cocok untuk klien yang tidak bisa menyisipkan parameter di path.',
        auth: 'api-key',
        rateLimit: '20 request per menit (per IP)',
        params: [
            {
                name: 'X-API-KEY',
                location: 'header',
                type: 'string',
                required: true,
                description: 'API key aplikasi.',
                example: 'YOUR_API_KEY',
            },
            {
                name: 'ticket_number',
                location: 'query',
                type: 'string',
                required: true,
                description: 'Nomor tiket yang akan dicek.',
                example: 'L-1400/112026/0001',
            },
        ],
        success: {
            statusCode: 200,
            description: 'Detail tiket ditemukan.',
            body: JSON.stringify(
                {
                    success: true,
                    message: 'Detail tiket ditemukan.',
                    data: {
                        id: 1001,
                        ticket_number: 'L-1400/112026/0001',
                        classification: 'pengaduan',
                        title: 'Jalan rusak di depan kantor',
                        status: 'baru',
                        channel: 'Website',
                        created_at: '2026-11-07T21:00:00+07:00',
                        completed_at: null,
                        attachments: [],
                        responses: [],
                    },
                },
                null,
                2,
            ),
        },
        errors: [
            {
                statusCode: 400,
                description: 'Parameter ticket_number wajib diisi atau format tidak valid.',
                body: JSON.stringify({ success: false, message: 'Parameter ticket_number wajib diisi.' }, null, 2),
            },
            {
                statusCode: 401,
                description: 'API key tidak valid atau hilang.',
                body: JSON.stringify({ success: false, message: 'Unauthorized. Invalid or missing API key.' }, null, 2),
            },
            {
                statusCode: 404,
                description: 'Tiket tidak ditemukan.',
                body: JSON.stringify({ success: false, message: 'Nomor tiket tidak ditemukan.' }, null, 2),
            },
            {
                statusCode: 429,
                description: 'Terlalu banyak request.',
                body: JSON.stringify({ message: 'Terlalu banyak request.', code: 'throttled' }, null, 2),
            },
        ],
        codeExamples: [
            {
                label: 'cURL',
                code: `curl -X GET "${BASE_URL_PLACEHOLDER}/api/check?ticket_number=L-1400%2F112026%2F0001" \\\n  -H "X-API-KEY: YOUR_API_KEY"`,
            },
            {
                label: 'JavaScript (fetch)',
                code: `const params = new URLSearchParams({\n  ticket_number: 'L-1400/112026/0001'\n});\nfetch('${BASE_URL_PLACEHOLDER}/api/check?' + params, {\n  headers: { 'X-API-KEY': 'YOUR_API_KEY' }\n}).then(r => r.json());`,
            },
            {
                label: 'PHP (Laravel Http)',
                code: `$response = Http::withHeaders([\n  'X-API-KEY' => 'YOUR_API_KEY',\n])\n  ->get('${BASE_URL_PLACEHOLDER}/api/check', [\n    'query' => ['ticket_number' => 'L-1400/112026/0001'],\n  ]);`,
            },
            {
                label: 'Dart/Flutter (http)',
                code: `final uri = Uri.parse('${BASE_URL_PLACEHOLDER}/api/check').replace(\n  queryParameters: { 'ticket_number': 'L-1400/112026/0001' },\n);\nfinal response = await http.get(uri, headers: { 'X-API-KEY': 'YOUR_API_KEY' });`,
            },
        ],
    },
    {
        id: 'tickets-check-path',
        method: 'GET',
        path: '/api/check/{ticketNumber}',
        title: 'Cek Tiket (Path Parameter)',
        description:
            'Memeriksa status tiket menggunakan nomor tiket di path. ' +
            'Karena nomor tiket mengandung "/" (contoh L-0001/11/2026), nilai harus di-URL-encode.',
        auth: 'api-key',
        rateLimit: '20 request per menit (per IP)',
        params: [
            {
                name: 'X-API-KEY',
                location: 'header',
                type: 'string',
                required: true,
                description: 'API key aplikasi.',
                example: 'YOUR_API_KEY',
            },
            {
                name: 'ticketNumber',
                location: 'path',
                type: 'string',
                required: true,
                description: 'Nomor tiket (mengandung "/", harus di-URL-encode).',
                example: 'L-1400%2F112026%2F0001',
            },
        ],
        success: {
            statusCode: 200,
            description: 'Detail tiket ditemukan.',
            body: JSON.stringify(
                {
                    success: true,
                    message: 'Detail tiket ditemukan.',
                    data: {
                        id: 1001,
                        ticket_number: 'L-1400/112026/0001',
                        classification: 'pengaduan',
                        title: 'Jalan rusak di depan kantor',
                        status: 'baru',
                        channel: 'Website',
                        created_at: '2026-11-07T21:00:00+07:00',
                        completed_at: null,
                        attachments: [],
                        responses: [],
                    },
                },
                null,
                2,
            ),
        },
        errors: [
            {
                statusCode: 401,
                description: 'API key tidak valid atau hilang.',
                body: JSON.stringify({ success: false, message: 'Unauthorized. Invalid or missing API key.' }, null, 2),
            },
            {
                statusCode: 404,
                description: 'Tiket tidak ditemukan.',
                body: JSON.stringify({ success: false, message: 'Nomor tiket tidak ditemukan.' }, null, 2),
            },
            {
                statusCode: 429,
                description: 'Terlalu banyak request.',
                body: JSON.stringify({ message: 'Terlalu banyak request.', code: 'throttled' }, null, 2),
            },
        ],
        codeExamples: [
            {
                label: 'cURL',
                code: `curl -X GET "${BASE_URL_PLACEHOLDER}/api/check/L-1400%2F112026%2F0001" \\\n  -H "X-API-KEY: YOUR_API_KEY"`,
            },
            {
                label: 'JavaScript (fetch)',
                code: `const ticketNumber = encodeURIComponent('L-1400/112026/0001');\nfetch('${BASE_URL_PLACEHOLDER}/api/check/' + ticketNumber, {\n  headers: { 'X-API-KEY': 'YOUR_API_KEY' }\n}).then(r => r.json());`,
            },
            {
                label: 'PHP (Laravel Http)',
                code: `$response = Http::withHeaders([\n  'X-API-KEY' => 'YOUR_API_KEY',\n])\n  ->get('${BASE_URL_PLACEHOLDER}/api/check/' . rawurlencode('L-1400/112026/0001'));`,
            },
            {
                label: 'Dart/Flutter (http)',
                code: `final ticketNumber = Uri.encodeComponent('L-1400/112026/0001');\nfinal response = await http.get(\n  Uri.parse('${BASE_URL_PLACEHOLDER}/api/check/' + ticketNumber),\n  headers: { 'X-API-KEY': 'YOUR_API_KEY' },\n);`,
            },
        ],
    },
    {
        id: 'tickets-reply',
        method: 'POST',
        path: '/api/check/{ticketNumber}/reply',
        title: 'Balas Tiket',
        description: 'Pelapor membalas tanggapan tiket. Tiket yang sudah selesai tidak dapat dibalas.',
        auth: 'api-key',
        rateLimit: '10 request per menit (per IP)',
        params: [
            {
                name: 'X-API-KEY',
                location: 'header',
                type: 'string',
                required: true,
                description: 'API key aplikasi.',
                example: 'YOUR_API_KEY',
            },
            {
                name: 'ticketNumber',
                location: 'path',
                type: 'string',
                required: true,
                description: 'Nomor tiket (harus di-URL-encode jika mengandung "/").',
                example: 'L-1400%2F112026%2F0001',
            },
            {
                name: 'message',
                location: 'body',
                type: 'string',
                required: true,
                description: 'Isi balasan (minimal 5 karakter).',
                example: 'Saya sudah memperbaiki jalan tersebut.',
            },
            {
                name: 'attachments',
                location: 'body',
                type: 'file[]',
                required: false,
                description: 'Lampiran maksimal 3 file (jpg, jpeg, png, pdf, maksimal 2MB per file).',
            },
        ],
        success: {
            statusCode: 201,
            description: 'Balasan berhasil terkirim.',
            body: JSON.stringify(
                {
                    success: true,
                    message: 'Balasan berhasil terkirim.',
                    data: {
                        id: 2001,
                        type: 'balasan_pelapor',
                        message: 'Saya sudah memperbaiki jalan tersebut.',
                        sent_at: '2026-11-07T21:30:00+07:00',
                        attachments: [],
                    },
                },
                null,
                2,
            ),
        },
        errors: [
            {
                statusCode: 400,
                description: 'Tiket telah selesai.',
                body: JSON.stringify({ success: false, message: 'Tiket telah selesai dan tidak dapat dibalas.' }, null, 2),
            },
            {
                statusCode: 401,
                description: 'API key tidak valid atau hilang.',
                body: JSON.stringify({ success: false, message: 'Unauthorized. Invalid or missing API key.' }, null, 2),
            },
            {
                statusCode: 404,
                description: 'Tiket tidak ditemukan.',
                body: JSON.stringify({ success: false, message: 'Nomor tiket tidak ditemukan.' }, null, 2),
            },
            {
                statusCode: 422,
                description: 'Validasi gagal.',
                body: JSON.stringify(
                    { success: false, message: 'Validasi gagal.', errors: { message: ['Pesan balasan minimal 5 karakter.'] } },
                    null,
                    2,
                ),
            },
            {
                statusCode: 429,
                description: 'Terlalu banyak request.',
                body: JSON.stringify({ message: 'Terlalu banyak request.', code: 'throttled' }, null, 2),
            },
        ],
        codeExamples: [
            {
                label: 'cURL',
                code: `curl -X POST "${BASE_URL_PLACEHOLDER}/api/check/L-1400%2F112026%2F0001/reply" \\\n  -H "X-API-KEY: YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"message":"Saya sudah memperbaiki jalan tersebut"}'`,
            },
            {
                label: 'JavaScript (fetch)',
                code: `const ticketNumber = encodeURIComponent('L-1400/112026/0001');\nfetch('${BASE_URL_PLACEHOLDER}/api/check/' + ticketNumber + '/reply', {\n  method: 'POST',\n  headers: {\n    'X-API-KEY': 'YOUR_API_KEY',\n    'Content-Type': 'application/json',\n  },\n  body: JSON.stringify({ message: 'Saya sudah memperbaiki jalan tersebut' }),\n}).then(r => r.json());`,
            },
            {
                label: 'PHP (Laravel Http)',
                code: `$response = Http::withHeaders([\n  'X-API-KEY' => 'YOUR_API_KEY',\n])\n  ->post('${BASE_URL_PLACEHOLDER}/api/check/' . rawurlencode('L-1400/112026/0001') . '/reply', [\n    'message' => 'Saya sudah memperbaiki jalan tersebut',\n  ]);`,
            },
            {
                label: 'Dart/Flutter (http)',
                code: `final ticketNumber = Uri.encodeComponent('L-1400/112026/0001');\nfinal response = await http.post(\n  Uri.parse('${BASE_URL_PLACEHOLDER}/api/check/' + ticketNumber + '/reply'),\n  headers: {\n    'X-API-KEY': 'YOUR_API_KEY',\n    'Content-Type': 'application/json',\n  },\n  body: jsonEncode({ message: 'Saya sudah memperbaiki jalan tersebut' }),\n);`,
            },
        ],
    },
    {
        id: 'tickets-complete',
        method: 'POST',
        path: '/api/check/{ticketNumber}/complete',
        title: 'Tandai Tiket Selesai',
        description: 'Pelapor menandai tiket sebagai selesai.',
        auth: 'api-key',
        rateLimit: '10 request per menit (per IP)',
        params: [
            {
                name: 'X-API-KEY',
                location: 'header',
                type: 'string',
                required: true,
                description: 'API key aplikasi.',
                example: 'YOUR_API_KEY',
            },
            {
                name: 'ticketNumber',
                location: 'path',
                type: 'string',
                required: true,
                description: 'Nomor tiket (harus di-URL-encode jika mengandung "/").',
                example: 'L-1400%2F112026%2F0001',
            },
        ],
        success: {
            statusCode: 200,
            description: 'Laporan telah ditandai selesai.',
            body: JSON.stringify(
                {
                    success: true,
                    message: 'Laporan telah ditandai selesai.',
                },
                null,
                2,
            ),
        },
        errors: [
            {
                statusCode: 401,
                description: 'API key tidak valid atau hilang.',
                body: JSON.stringify({ success: false, message: 'Unauthorized. Invalid or missing API key.' }, null, 2),
            },
            {
                statusCode: 404,
                description: 'Tiket tidak ditemukan.',
                body: JSON.stringify({ success: false, message: 'Nomor tiket tidak ditemukan.' }, null, 2),
            },
            {
                statusCode: 429,
                description: 'Terlalu banyak request.',
                body: JSON.stringify({ message: 'Terlalu banyak request.', code: 'throttled' }, null, 2),
            },
        ],
        codeExamples: [
            {
                label: 'cURL',
                code: `curl -X POST "${BASE_URL_PLACEHOLDER}/api/check/L-1400%2F112026%2F0001/complete" \\\n  -H "X-API-KEY: YOUR_API_KEY"`,
            },
            {
                label: 'JavaScript (fetch)',
                code: `const ticketNumber = encodeURIComponent('L-1400/112026/0001');\nfetch('${BASE_URL_PLACEHOLDER}/api/check/' + ticketNumber + '/complete', {\n  method: 'POST',\n  headers: { 'X-API-KEY': 'YOUR_API_KEY' }\n}).then(r => r.json());`,
            },
            {
                label: 'PHP (Laravel Http)',
                code: `$response = Http::withHeaders([\n  'X-API-KEY' => 'YOUR_API_KEY',\n])\n  ->post('${BASE_URL_PLACEHOLDER}/api/check/' . rawurlencode('L-1400/112026/0001') . '/complete');`,
            },
            {
                label: 'Dart/Flutter (http)',
                code: `final ticketNumber = Uri.encodeComponent('L-1400/112026/0001');\nfinal response = await http.post(\n  Uri.parse('${BASE_URL_PLACEHOLDER}/api/check/' + ticketNumber + '/complete'),\n  headers: { 'X-API-KEY': 'YOUR_API_KEY' },\n);`,
            },
        ],
    },
];

/**
 * Kode error HTTP yang umum digunakan API ini.
 */
export const API_ERROR_CODES: Array<{
    code: number;
    name: string;
    description: string;
    exampleBody: string;
    note?: string;
}> = [
    {
        code: 401,
        name: 'Unauthorized',
        description: 'API key tidak valid, hilang, atau token Bearer tidak dikenali.',
        exampleBody: JSON.stringify(
            { success: false, message: 'Unauthorized. Invalid or missing API key.' },
            null,
            2,
        ),
    },
    {
        code: 403,
        name: 'Forbidden',
        description: 'Akun dinonaktifkan atau tidak memiliki akses.',
        exampleBody: JSON.stringify({ message: 'Akun Anda dinonaktifkan.', code: 'account_disabled' }, null, 2),
    },
    {
        code: 404,
        name: 'Not Found',
        description: 'Tiket atau resource yang dicari tidak ditemukan.',
        exampleBody: JSON.stringify({ success: false, message: 'Nomor tiket tidak ditemukan.' }, null, 2),
    },
    {
        code: 422,
        name: 'Unprocessable Entity',
        description: 'Validasi input gagal (field wajib kosong, format salah, dll).',
        exampleBody: JSON.stringify(
            { success: false, message: 'Validasi gagal.', errors: { title: ['Judul laporan wajib diisi.'] } },
            null,
            2,
        ),
    },
    {
        code: 429,
        name: 'Too Many Requests',
        description: 'Melewati batas rate limit. Header `Retry-After` berisi sisa detik sebelum bisa mencoba lagi.',
        exampleBody: JSON.stringify(
            { message: 'Terlalu banyak request.', code: 'throttled', retry_after: 60 },
            null,
            2,
        ),
        note: 'Batas: ticket-store 5/menit, ticket-check 20/menit, ticket-reply 10/menit, auth/token 10/menit.',
    },
    {
        code: 500,
        name: 'Internal Server Error',
        description: 'Terjadi kesalahan pada server. Detail teknis tidak dibocorkan ke pengguna.',
        exampleBody: JSON.stringify({ message: 'Terjadi kesalahan pada server.', code: 'server_error' }, null, 2),
    },
];

/**
 * Langkah panduan cepat untuk menggunakan API.
 */
export const QUICK_START_STEPS: Array<{
    step: number;
    title: string;
    description: string;
    endpoint?: string;
}> = [
    {
        step: 1,
        title: 'Siapkan API Key',
        description: 'Pastikan variabel `API_KEY` di file `.env` server sudah diisi. Nilai ini adalah `X-API-KEY` yang akan dikirim klien.',
    },
    {
        step: 2,
        title: 'Masuk (Mobile)',
        description: 'Klien mobile memanggil POST /api/auth/token dengan email dan sandi untuk mendapatkan token Bearer.',
        endpoint: 'auth-token-store',
    },
    {
        step: 3,
        title: 'Buat Tiket',
        description: 'Panggil POST /api/tickets dengan header X-API-KEY dan data tiket untuk membuat laporan baru.',
        endpoint: 'tickets-store',
    },
    {
        step: 4,
        title: 'Cek Status',
        description: 'Gunakan GET /api/check/{ticketNumber} untuk memantau status tiket dari waktu ke waktu.',
        endpoint: 'tickets-check-path',
    },
];

/**
 * Panduan autentikasi mobile.
 */
export const MOBILE_AUTH_GUIDE: Array<{
    step: number;
    title: string;
    description: string;
    endpoint?: string;
}> = [
    {
        step: 1,
        title: 'Login',
        description: 'Panggil POST /api/auth/token dengan email, sandi, dan opsional device_name. Simpan token yang dikembalikan.',
        endpoint: 'auth-token-store',
    },
    {
        step: 2,
        title: 'Simpan Token',
        description: 'Simpan `data.token` dan `data.token_type` (Bearer) di penyimpanan aman aplikasi klien (misal: Flutter Secure Storage).',
    },
    {
        step: 3,
        title: 'Kirim Header Authorization',
        description: 'Untuk setiap request yang memerlukan autentikasi, tambahkan header `Authorization: Bearer <token>`.',
    },
    {
        step: 4,
        title: 'Akses Profil',
        description: 'Panggil GET /api/user untuk memverifikasi token dan mendapatkan data pengguna.',
        endpoint: 'auth-user',
    },
    {
        step: 5,
        title: 'Logout',
        description: 'Panggil DELETE /api/auth/token untuk mencabut token saat logout.',
        endpoint: 'auth-token-destroy',
    },
    {
        step: 6,
        title: 'Kebijakan Token',
        description: 'Satu token aktif per akun per jenis klien. Login mobile baru mencabut token mobile lama. Token web dan mobile tidak saling meniadakan. Batas 10 request per menit untuk login.',
    },
];

/**
 * Penjelasan khusus format nomor tiket.
 */
export const TICKET_NUMBER_NOTE = {
    title: 'Format Nomor Tiket',
    description:
        'Nomor tiket memiliki format seperti `L-1400/112026/0001` yang mengandung karakter "/" (garis miring). ' +
        'Karena karakter "/" memiliki arti khusus dalam URL, nilai tersebut WAJIB di-URL-encode sebelum disisipkan di path:',
    examples: [
        { label: 'JavaScript', code: `encodeURIComponent('L-1400/112026/0001') // "L-1400%2F112026%2F0001"` },
        { label: 'PHP', code: `rawurlencode('L-1400/112026/0001') // "L-1400%2F112026%2F0001"` },
        { label: 'Dart/Flutter', code: `Uri.encodeComponent('L-1400/112026/0001') // "L-1400%2F112026%2F0001"` },
    ],
};
