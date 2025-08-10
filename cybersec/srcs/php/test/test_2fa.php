<?php
require_once 'vendor/autoload.php';

use RobThree\Auth\TwoFactorAuth;
use RobThree\Auth\Providers\Qr\BaconQrCodeProvider;
use RobThree\Auth\Algorithm;

$tfa = new TwoFactorAuth(
    new BaconQrCodeProvider(),
    6,
    30,
    Algorithm::Sha1,
    'MonSiteSecurisé'
);

// 🔁 Met ici le secret depuis ta base
$secret = '12345'; // à remplacer

$code = $_GET['code'] ?? '';

if ($tfa->verifyCode($secret, $code)) {
    echo "✅ Code valide";
} else {
    echo "❌ Code invalide";
}
