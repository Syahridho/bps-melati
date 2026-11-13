<?php
require 'vendor/autoload.php';

echo "Classification Meta Test:\n";
$meta = App\Models\Ticket::classificationMeta("pengaduan");
echo "pengaduan: " . $meta["prefix"] . "-" . $meta["code"] . "\n";

$meta = App\Models\Ticket::classificationMeta("aspirasi");
echo "aspirasi: " . $meta["prefix"] . "-" . $meta["code"] . "\n";

$meta = App\Models\Ticket::classificationMeta("permintaan_informasi");
echo "permintaan_informasi: " . $meta["prefix"] . "-" . $meta["code"] . "\n";

echo "\n--- Testing generateTicketNumber ---\n";

// Test with pengaduan
$result = App\Models\Ticket::generateTicketNumber("pengaduan", "2026-11");
echo "pengaduan generate: " . $result['ticket_number'] . "\n";
echo "pengaduan sequence: " . $result['sequence'] . "\n";

// Test with aspirasi
$result = App\Models\Ticket::generateTicketNumber("aspirasi", "2026-11");
echo "aspirasi generate: " . $result['ticket_number'] . "\n";
echo "aspirasi sequence: " . $result['sequence'] . "\n";

// Test with permintaan_informasi
$result = App\Models\Ticket::generateTicketNumber("permintaan_informasi", "2026-11");
echo "perm_informasi generate: " . $result['ticket_number'] . "\n";
echo "perm_informasi sequence: " . $result['sequence'] . "\n";

echo "\n--- Testing generateAdminTicketNumber (lama) ---\n";
$result = App\Models\Ticket::generateAdminTicketNumber("Admin", "2026-11");
echo "admin generate: " . $result['ticket_number'] . "\n";
echo "admin sequence: " . $result['sequence'] . "\n";