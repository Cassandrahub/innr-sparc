export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // Safe body parsing for all environments
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { email, firstName, lastName, phone } = body;

    if (!email || !firstName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Format phone number to E.164 if provided
    const formattedPhone = phone
      ? '+63' + phone.replace(/^0/, '').replace(/\s+/g, '').replace(/-/g, '')
      : null;

    // 1. Add/update contact in Brevo
    const payload = {
      email,
      attributes: {
        FIRSTNAME: firstName,
        LASTNAME: lastName || '',
        ...(formattedPhone && { SMS: formattedPhone })
      },
      listIds: [6],
      updateEnabled: true
    };

    const contactRes = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY
      },
      body: JSON.stringify(payload)
    });

    // 201 = created, 204 = updated, some Brevo plans return 200
    // 400 with "Contact already exist" is also safe to treat as success
    if (
      contactRes.status !== 201 &&
      contactRes.status !== 204 &&
      contactRes.status !== 200
    ) {
      const errData = await contactRes.json().catch(() => ({}));
      const isAlreadyExists =
        typeof errData.message === 'string' &&
        errData.message.toLowerCase().includes('contact already exist');

      if (!isAlreadyExists) {
        console.error('Brevo contact error:', errData);
        return res.status(400).json({ error: errData.message || 'Brevo API error' });
      }
    }

    // 2. Send notification email to broker
    const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: {
          name: 'Savia Parkway Leads',
          email: 'annacassandra0519@gmail.com'
        },
        to: [{ email: 'annacassandra0519@gmail.com' }],
        subject: `🔔 Bagong Lead: ${firstName} ${lastName || ''}`.trim(),
        htmlContent: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;">
            <h2 style="color:#2e5633;">Bagong Inquiry — Savia Parkway</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0;color:#666;width:120px;">Pangalan:</td>
                <td style="padding:8px 0;font-weight:bold;">${firstName} ${lastName || ''}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#666;">Email:</td>
                <td style="padding:8px 0;font-weight:bold;">${email}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#666;">Numero:</td>
                <td style="padding:8px 0;font-weight:bold;">${phone || 'Hindi ibinigay'}</td>
              </tr>
            </table>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0;"/>
            <p style="color:#888;font-size:13px;">
              I-follow up agad habang mainit pa ang interes nila!
            </p>
          </div>
        `
      })
    });

    if (!emailRes.ok) {
      // Log but don't fail the request — contact was already saved
      const emailErr = await emailRes.json().catch(() => ({}));
      console.error('Brevo email error:', emailErr);
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('SUBSCRIBE HANDLER ERROR:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
