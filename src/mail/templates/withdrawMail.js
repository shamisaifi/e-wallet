export const withdrawMail = (amount) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Withdrawal Successful</title>
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">
<table width="100%">
<tr>
<td align="center" style="padding:40px 15px;">
<table width="650" style="background:#fff;border-radius:18px;overflow:hidden;">

<tr>
<td align="center" style="padding:45px;background:linear-gradient(135deg,#ea580c,#f97316);">
<h1 style="color:white;margin:0;">WalletNest</h1>
<p style="color:#fed7aa;">Withdrawal Successful</p>
</td>
</tr>

<tr>
<td style="padding:40px;">
<h2 style="color:#111827;">Withdrawal completed</h2>

<p style="color:#4b5563;line-height:1.8;">
Funds have been withdrawn successfully from your wallet.
</p>

<div style="background:#fff7ed;padding:30px;border-radius:16px;text-align:center;">
<div style="color:#6b7280;">Withdrawn Amount</div>
<div style="font-size:42px;font-weight:800;color:#ea580c;">
₹${amount}
</div>
</div>

<p style="margin-top:30px;color:#4b5563;">
The withdrawal has been processed successfully.
</p>
</td>
</tr>

<tr>
<td align="center" style="padding:25px;background:#f8fafc;color:#94a3b8;">
© WalletNest
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>
`;