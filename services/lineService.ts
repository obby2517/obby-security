
import { Visitor } from "../types";

const LINE_ACCESS_TOKEN = "oSsJMdGCwXTISFue5d3sxHIKb5jVn5994dyN2cSlTAwUHOpYK1MmKm5BMUIPxnlE7hl+6gSVO/0p64iUZadxXht2OCQaRuFAuUAuKe1JSPOD/mcQF6zOI398uKd0+kZOVZGN+rxZvtuC/Bj5gcTMLgdB04t89/1O/w1cDnyilFU=";
const LINE_USER_ID = "U669a19a303fd99c1499d36e135c8a926";
const LINE_API_ENDPOINT = "https://api.line.me/v2/bot/message/push";

/**
 * Note: Direct calls to LINE API from browser will likely trigger CORS errors.
 * In a production environment, these should be handled via a secure backend proxy or 
 * directly within the Google Apps Script 'doPost' to avoid exposing tokens and CORS issues.
 */

export async function sendVisitorCheckInNotification(visitor: Visitor) {
  const checkInDate = new Date(visitor.checkInTime);
  const timeStr = checkInDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateStr = checkInDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });

  const flexMessage: any = {
    "type": "bubble",
    "size": "mega",
    "header": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        { "type": "text", "text": "⚜️ EXCLUSIVE ACCESS", "color": "#D4AF37", "weight": "bold", "size": "xxs", "letterSpacing": "3px" },
        { "type": "text", "text": "VISITOR ARRIVAL", "color": "#ffffff", "weight": "bold", "size": "xxl", "margin": "sm" }
      ],
      "backgroundColor": "#064e3b",
      "paddingAll": "30px"
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "box",
          "layout": "vertical",
          "contents": [
            { "type": "text", "text": "DESTINATION HOUSE", "size": "xxs", "color": "#8c8c8c", "weight": "bold", "letterSpacing": "1px" },
            { "type": "text", "text": "บ้านเลขที่ " + visitor.houseNumber, "size": "xl", "weight": "bold", "color": "#111111", "margin": "xs" }
          ]
        },
        { "type": "separator", "margin": "xl", "color": "#eeeeee" },
        {
          "type": "box",
          "layout": "vertical",
          "margin": "xl",
          "spacing": "md",
          "contents": [
            {
              "type": "box", "layout": "horizontal", "contents": [
                { "type": "text", "text": "ชื่อผู้ติดต่อ", "size": "sm", "color": "#666666", "flex": 4 },
                { "type": "text", "text": visitor.name || "ไม่ระบุชื่อ", "size": "sm", "color": "#111111", "align": "end", "weight": "bold", "flex": 6 }
              ]
            },
            {
              "type": "box", "layout": "horizontal", "contents": [
                { "type": "text", "text": "ทะเบียนรถ", "size": "sm", "color": "#666666", "flex": 4 },
                { "type": "text", "text": visitor.licensePlate || "ไม่ระบุ", "size": "sm", "color": "#111111", "align": "end", "weight": "bold", "flex": 6 }
              ]
            },
            {
              "type": "box", "layout": "horizontal", "contents": [
                { "type": "text", "text": "เวลาที่เข้า", "size": "sm", "color": "#666666", "flex": 4 },
                { "type": "text", "text": timeStr + " น.", "size": "sm", "color": "#111111", "align": "end", "weight": "bold", "flex": 6 }
              ]
            }
          ]
        },
        {
          "type": "box", "layout": "vertical", "margin": "xxl", "backgroundColor": "#f8fafc", "paddingAll": "15px", "cornerRadius": "md", "contents": [
            { "type": "text", "text": "📅 " + dateStr, "size": "xxs", "color": "#64748b", "align": "center", "weight": "bold" }
          ]
        }
      ],
      "paddingAll": "30px"
    },
    "footer": {
      "type": "box", "layout": "vertical", "contents": [
        { "type": "text", "text": "SECURED BY SMART VILLAGE GUARD", "size": "xxs", "color": "#D4AF37", "align": "center", "weight": "bold" }
      ],
      "paddingAll": "15px", "backgroundColor": "#064e3b"
    }
  };

  return sendToLine(flexMessage, "🔔 แจ้งเตือนผู้เข้าพบ บ้าน " + visitor.houseNumber);
}

export async function sendVisitorCheckOutNotification(visitor: Visitor) {
  if (!visitor.checkOutTime) return;
  const timeStr = new Date(visitor.checkOutTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });

  const flexMessage: any = {
    "type": "bubble",
    "size": "mega",
    "header": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        { "type": "text", "text": "✓ DEPARTURE CONFIRMED", "color": "#ffffff", "weight": "bold", "size": "xxs", "letterSpacing": "2px" },
        { "type": "text", "text": "CHECK-OUT SUCCESS", "color": "#ffffff", "weight": "bold", "size": "xl", "margin": "sm" }
      ],
      "backgroundColor": "#1e40af",
      "paddingAll": "25px"
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            {
              "type": "box", "layout": "vertical", "contents": [
                { "type": "text", "text": "HOUSE", "size": "xxs", "color": "#8c8c8c", "weight": "bold" },
                { "type": "text", "text": visitor.houseNumber, "size": "lg", "weight": "bold", "color": "#111111" }
              ], "flex": 1
            },
            {
              "type": "box", "layout": "vertical", "contents": [
                { "type": "text", "text": "TIME OUT", "size": "xxs", "color": "#8c8c8c", "weight": "bold", "align": "end" },
                { "type": "text", "text": timeStr + " น.", "size": "lg", "weight": "bold", "color": "#1e40af", "align": "end" }
              ], "flex": 1
            }
          ]
        }
      ],
      "paddingAll": "25px"
    }
  };

  return sendToLine(flexMessage, "✅ แจ้งออกสำเร็จ บ้าน " + visitor.houseNumber);
}

async function sendToLine(contents: any, altText: string) {
  try {
    const response = await fetch(LINE_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + LINE_ACCESS_TOKEN
      },
      body: JSON.stringify({
        "to": LINE_USER_ID,
        "messages": [
          {
            "type": "flex",
            "altText": altText,
            "contents": contents
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn("LINE API Response Error:", errText);
      return false;
    }
    return true;
  } catch (error) {
    // If the error is 'Failed to fetch', it's likely a CORS issue.
    // We log it as a warning since the main data is saved to Google Sheets anyway.
    console.warn("LINE Notification could not be sent (likely CORS or Network error). Main record saved.");
    return false;
  }
}
