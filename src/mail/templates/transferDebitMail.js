export const transferDebitMail = (amount) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Money Sent</title>
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">
<table width="100%">
<tr>
<td align="center" style="padding:40px 15px;">
<table width="650" style="background:#fff;border-radius:18px;overflow:hidden;">

<tr>
<td align="center" style="padding:45px;background:linear-gradient(135deg,#dc2626,#ef4444);">
<h1 style="color:white;margin:0;">WalletNest</h1>
<p style="color:#fee2e2;">Money Sent Successfully</p>
</td>
</tr>

<tr>
<td style="padding:40px;">
<h2 style="color:#111827;">Money sent successfully</h2>

<p style="color:#4b5563;line-height:1.8;">
Your transfer has been processed successfully.
</p>

<div style="background:#fef2f2;padding:30px;border-radius:16px;text-align:center;">
<div style="color:#6b7280;">Amount Sent</div>
<div style="font-size:42px;font-weight:800;color:#dc2626;">
₹${amount}
</div>
</div>

<p style="margin-top:30px;color:#4b5563;">
The amount has been deducted from your wallet balance.
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