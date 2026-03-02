exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email, firstName, lastName, phone } = JSON.parse(event.body);

    if (!email || !firstName) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    // 1. Add contact to Brevo list
    const payload = {
      email: email,
      attributes: {
        FIRSTNAME: firstName,
        LASTNAME:  lastName || '',
        SMS:       phone || undefined
      },
      listIds:       [3],
      updateEnabled: true
    };

    if (!payload.attributes.SMS)      delete payload.attributes.SMS;
    if (!payload.attributes.LASTNAME) delete payload.attributes.LASTNAME;

    const contactRes = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key':      process.env.BREVO_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (contactRes.status !== 201 && contactRes.status !== 204) {
      const errData = await contactRes.json().catch(() => ({}));
      return { statusCode: 400, body: JSON.stringify({ error: errData.message || 'Brevo API error' }) };
    }

    // 2. Send notification email to yourself with full name
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key':      process.env.BREVO_API_KEY
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

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
