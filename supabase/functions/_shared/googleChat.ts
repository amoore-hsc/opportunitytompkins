// Shared Google Chat notifier.
// If GOOGLE_CHAT_WEBHOOK_URL is not configured, every call is a silent no-op,
// so existing email notifications keep working unchanged.

export interface ChatField {
  label: string;
  value: string;
}

export interface ChatNotification {
  title: string;
  subtitle?: string;
  fields?: ChatField[];
  body?: string;
  linkText?: string;
  linkUrl?: string;
  /** Emoji shown before the title, e.g. "🚨" */
  icon?: string;
}

const escapeText = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function notifyGoogleChat(
  notification: ChatNotification,
): Promise<boolean> {
  const webhookUrl = Deno.env.get("GOOGLE_CHAT_WEBHOOK_URL");
  if (!webhookUrl) return false;

  const { title, subtitle, fields = [], body, linkText, linkUrl, icon } =
    notification;

  const widgets: Record<string, unknown>[] = [];

  if (body) {
    widgets.push({ textParagraph: { text: escapeText(body) } });
  }

  for (const field of fields) {
    widgets.push({
      decoratedText: {
        topLabel: escapeText(field.label),
        text: escapeText(field.value),
        wrapText: true,
      },
    });
  }

  if (linkUrl) {
    widgets.push({
      buttonList: {
        buttons: [
          {
            text: linkText || "Open",
            onClick: { openLink: { url: linkUrl } },
          },
        ],
      },
    });
  }

  const payload = {
    cardsV2: [
      {
        cardId: `tompkins-${Date.now()}`,
        card: {
          header: {
            title: `${icon ? `${icon} ` : ""}${title}`,
            subtitle: subtitle || "Tompkins Opportunity",
          },
          sections: [{ widgets }],
        },
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error("Google Chat notification failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    // Notifications must never break the primary workflow.
    console.error("Google Chat notification error:", err);
    return false;
  }
}
