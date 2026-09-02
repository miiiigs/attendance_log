import Image from "next/image";

export function AppLogo({ size = 44 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white"
      style={{ width: size, height: size }}
    >
      <Image
        src="/qrlog-logo.png"
        alt="QRLog"
        width={size}
        height={size}
        className="h-full w-full object-contain"
        priority
      />
    </div>
  );
}
