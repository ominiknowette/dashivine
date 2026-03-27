function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

async function sendTwilioMessage(payload) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappFrom = process.env.WHATSAPP_FROM;
  const whatsappTo = (process.env.WHATSAPP_TO || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!accountSid || !authToken || !whatsappFrom || whatsappTo.length === 0) {
    throw new Error("Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, WHATSAPP_FROM, or WHATSAPP_TO");
  }

  const scoreLine = `${payload.correctAnswers}/${payload.totalQuestions} (${payload.score}%)`;
  const answerLine = payload.answer === "no"
    ? `She answered NO after ${payload.noTapCount || 0} extra prompts.`
    : `She answered ${String(payload.answer || "the question").toUpperCase()}.`;

  const body = new URLSearchParams();
  body.set("From", whatsappFrom);
  body.set("Body", `${answerLine} Quiz score: ${scoreLine}.`);
  whatsappTo.forEach((entry) => body.append("To", entry));

  const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Twilio request failed (${response.status}): ${responseText}`);
  }

  return responseText;
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const result = await sendTwilioMessage(payload);
    return json(200, { ok: true, result });
  } catch (error) {
    return json(500, { error: error.message });
  }
}

