<?php
if (!empty($_POST['email'])) {
    $email = filter_var($_POST['email'], FILTER_VALIDATE_EMAIL);
    if ($email) {
        $file = fopen('subscribers.csv', 'a');
        fputcsv($file, [date('Y-m-d H:i:s'), $email]);
        fclose($file);
        header('Location: thanks.html');
        exit;
    }
}
header('Location: index.html?error=invalid');
?>
