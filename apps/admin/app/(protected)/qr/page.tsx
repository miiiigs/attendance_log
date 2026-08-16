import { QrPanel } from "../../../components/qr-panel";

export default function QrPage() {
  return (
    <section className="space-y-5">
      <div>
        <p className="admin-eyebrow">Attendance QR</p>
        <h1 className="admin-page-title mt-3">Daily attendance QR</h1>
        <p className="admin-page-subtitle mt-2">Generate and manage the QR people scan from the mobile app.</p>
      </div>
      <QrPanel />
    </section>
  );
}
