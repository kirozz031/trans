<?php
$db = new PDO('sqlite:/var/www/html/data/users.sqlite');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
foreach ($db->query("SELECT id, email, is_2fa_enabled FROM users") as $row) {
    echo "ID: {$row['id']} | Email: {$row['email']} | 2FA: {$row['is_2fa_enabled']}\n";
}
