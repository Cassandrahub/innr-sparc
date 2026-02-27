exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email, firstName, lastName, phone } = JSON.parse(event.body);

    if (!email || !firstName) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const payload = {
      email: email,
      attributes: {
        FIRSTNAME: firstName,
        LASTNAME:  lastName || '',
        SMS:       phone || undefined
      },
      listIds:       [3],       // Your Brevo List ID — confirm this is correct
      updateEnabled: true
    };

    if (!payload.attributes.SMS)      delete payload.attributes.SMS;
    if (!payload.attributes.LASTNAME) delete payload.attributes.LASTNAME;

    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key':      process.env.BREVO_API_KEY
      },
      body: JSON.stringify(payload)
    });

    // 201 = new contact created, 204 = existing contact updated
    if (response.status === 201 || response.status === 204) {
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    } else {
      const errData = await response.json().catch(() => ({}));
      return { statusCode: 400, body: JSON.stringify({ error: errData.message || 'Brevo API error' }) };
    }

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};