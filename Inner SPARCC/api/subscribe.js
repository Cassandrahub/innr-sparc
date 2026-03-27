export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { email, firstName, lastName, phone } = req.body;

    if (!email || !firstName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Add contact to Brevo list
    const payload = {
      email,
      attributes: {
        FIRSTNAME: firstName,
        LASTNAME: lastName || '',
        SMS: phone ? '+63' + phone.replace(/^0/, '').replace(/\s+/g, '') : undefined
      },
      listIds: [6],
      updateEnabled: true
    };

    if (!payload.attributes.SMS) delete payload.attributes.SMS;
    if (!payload.attributes.LASTNAME) delete payload.attributes.LASTNAME;

    const contactRes = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (contactRes.status !== 201 && contactRes.status !== 204) {
      const errData = await contactRes.json().catch(() => ({}));
      return res.status(400).json({ error: errData.message || 'Brevo API error' });
    }

    // 2. Send notification email
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: { name: 'Savia Parkway Leads', email: 'annacassandra0519@gmail.com' },
        to: [{ email: 'annacassandra0519@gmail.com' }],
        subject: `🔔 Bagong Lead: ${firstName} ${lastName}`.trim(),
        htmlContent: `
          <h2>Bagong inquiry sa Savia Parkway!</h2>
          <p><strong>Pangalan:</strong> ${firstName} ${lastName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Numero:</strong> ${phone || 'Hindi ibinigay'}</p>
          <hr/>
          <p><em>I-follow up agad habang mainit pa ang interes nila!</em></p>
        `
      })
    });

    return res.status(200).json({ ok: true });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
```

Then update your form's fetch URL from:
```
/.netlify/functions/subscribe
```
to:
```
/api/subscribe