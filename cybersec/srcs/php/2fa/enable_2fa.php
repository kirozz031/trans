<?php
require_once '../vendor/autoload.php';

use RobThree\Auth\TwoFactorAuth;
use RobThree\Auth\Providers\Qr\BaconQrCodeProvider;
use RobThree\Auth\Algorithm;

$tfa = new TwoFactorAuth(
    new BaconQrCodeProvider(),
    'FT_TRANSCENDENCE',
    6,               // Code à 6 chiffres
    60,              // Durée 30 secondes
    Algorithm::Sha1 // Algorithme utilisé
);

// Simule un utilisateur (remplacera plus tard par un JWT décodé)
$userId = 6;

try {
    $db = new PDO('sqlite:/var/www/html/data/users.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $secret = $tfa->createSecret();

    $stmt = $db->prepare("UPDATE users SET is_2fa_enabled = 1, twofa_secret = :secret WHERE id = :id");
    $stmt->execute([
        ':secret' => $secret,
        ':id' => $userId
    ]);

    // Génère un QR Code à scanner
    $qrCodeUrl = $tfa->getQRCodeImageAsDataUri("test@example.com", $secret);

    // Affiche la page
    echo "<h1>Double authentification activée</h1>";
    echo "<p>Scanne ce QR Code dans Google Authenticator :</p>";
    echo "<img src='$qrCodeUrl' />";
    echo "<p>Ou entre cette clé manuellement : <strong>$secret</strong></p>";

} catch (PDOException $e) {
    echo "Erreur : " . $e->getMessage();
}
