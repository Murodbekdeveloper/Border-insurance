// Shared HTML wrapper for every outbound email (verification code, policy
// confirmed, policy expiring). Styles are inlined throughout — most email
// clients (Gmail included) strip <style> blocks, so anything not inline
// simply wouldn't render.
const BRAND_ORANGE = '#f97316';
const TEXT_DARK = '#0f172a';
const TEXT_MUTED = '#64748b';
const BORDER = '#e2e8f0';
const BG = '#f8fafc';

export function renderEmailLayout(bodyHtml: string): string {
  return `
<div style="background-color:${BG};padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background-color:#ffffff;border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">
    <div style="background-color:${TEXT_DARK};padding:24px 32px;">
      <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.02em;">OSAGO <span style="color:${BRAND_ORANGE};">Online</span></span>
    </div>
    <div style="padding:32px;color:${TEXT_DARK};font-size:15px;line-height:1.6;">
      ${bodyHtml}
    </div>
    <div style="padding:20px 32px;border-top:1px solid ${BORDER};color:${TEXT_MUTED};font-size:12px;">
      Bu avtomatik xabar — unga javob yozmang.<br />
      &copy; ${new Date().getFullYear()} OSAGO Online
    </div>
  </div>
</div>`;
}

export function renderVerificationCodeEmail(code: string): string {
  return renderEmailLayout(`
    <p style="margin:0 0 8px;">Ro'yxatdan o'tishni yakunlash uchun tasdiqlash kodi:</p>
    <div style="margin:20px 0;text-align:center;background-color:${BG};border:1px dashed ${BRAND_ORANGE};border-radius:12px;padding:20px;">
      <span style="font-size:36px;font-weight:700;letter-spacing:0.3em;color:${TEXT_DARK};">${code}</span>
    </div>
    <p style="margin:0;color:${TEXT_MUTED};font-size:13px;">Kod 15 daqiqa davomida amal qiladi. Agar bu so'rovni siz bermagan bo'lsangiz, xabarni e'tiborsiz qoldiring.</p>
  `);
}

export function renderEmailChangeCodeEmail(code: string): string {
  return renderEmailLayout(`
    <p style="margin:0 0 8px;">Profilingizga ushbu emailni qo'shish/tasdiqlash uchun kod:</p>
    <div style="margin:20px 0;text-align:center;background-color:${BG};border:1px dashed ${BRAND_ORANGE};border-radius:12px;padding:20px;">
      <span style="font-size:36px;font-weight:700;letter-spacing:0.3em;color:${TEXT_DARK};">${code}</span>
    </div>
    <p style="margin:0;color:${TEXT_MUTED};font-size:13px;">Kod 15 daqiqa davomida amal qiladi. Agar bu so'rovni siz bermagan bo'lsangiz, xabarni e'tiborsiz qoldiring.</p>
  `);
}
