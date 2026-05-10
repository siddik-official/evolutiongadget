import Image from "next/image";
import Link from "next/link";

export function Logo({
  className = "",
  textColor = "text-black",
  taglineColor = "text-muted-foreground",
}: {
  className?: string;
  textColor?: string;
  taglineColor?: string;
}) {
  return (
    <Link href="/" className={`flex items-center gap-2 shrink-0 ${className}`}>
      <Image
        src="/logo.png"
        alt="Evolution Gadget logo"
        width={50}
        height={50}
        className="object-contain"
        priority
      />
      <div className="flex flex-col leading-tight">
        <span
          className={`text-2xl ${textColor} uppercase`}
          style={{
            fontFamily: "Noize Sport",
            fontWeight: "normal",
            fontStyle: "normal",
          }}
        >
          Evolution Gadget
        </span>
        <span
          className={`text-[10px] italic -mt-0.5 font-medium ${taglineColor}`}
        >
          Premium Tech Made Simple
        </span>
      </div>
    </Link>
  );
}
