import Image from "next/image";

export function GetTheCode({ path }: { path: string }) {
  return (
    <div className="flex items-center gap-2 text-md">
      <Image src="/github-mark.svg" alt="GitHub Logo" width={20} height={20} />{" "}
      <a
        href={`https://github.com/vvo/iron-session/tree/main/examples/next/src/${path}`}
        target="_blank"
        className="text-gray-700 underline hover:no-underline"
      >
        Get the code for this example
      </a>
    </div>
  );
}
