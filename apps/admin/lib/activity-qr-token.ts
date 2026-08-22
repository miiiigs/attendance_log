import "server-only";

/**
 * QR sessions only store the token hash in the database. The raw token is
 * needed to render the QR image, so it is retained in an httpOnly admin
 * cookie scoped to the activity. It is cleared when the QR is revoked,
 * replaced, or the activity ends.
 */
export function qrTokenCookieName(activityId: string) {
  return `activity_qr_token_${activityId}`;
}

export function qrTokenCookieMaxAge() {
  return 12 * 60 * 60;
}
