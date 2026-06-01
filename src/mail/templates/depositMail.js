export const depositMail = (amount) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Wallet Deposit Successful</title>
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">
<table width="100%">
<tr>
<td align="center" style="padding:40px 15px;">
<table width="650" style="background:#fff;border-radius:18px;overflow:hidden;">

<tr>
<td align="center" style="padding:45px;background:linear-gradient(135deg,#2563eb,#3b82f6);">
<h1 style="color:white;margin:0;">WalletNest</h1>
<p style="color:#dbeafe;">Wallet Deposit Successful</p>
</td>
</tr>

<tr>
<td style="padding:40px;">
<h2 style="color:#111827;">Deposit completed</h2>

<p style="color:#4b5563;line-height:1.8;">
Funds have been successfully added to your wallet.
</p>

<div style="background:#eff6ff;padding:30px;border-radius:16px;text-align:center;">
<div style="color:#6b7280;">Deposited Amount</div>
<div style="font-size:42px;font-weight:800;color:#2563eb;">
₹${amount}
</div>
</div>

<p style="margin-top:30px;color:#4b5563;">
Your wallet balance has been updated successfully.
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