import Image from "next/image";
import GitHubLogo from "./app/GitHubLogo";

export function GetTheCode({ path }: { path: string }) {
  return (
    <div className="flex items-center gap-2 text-md">
      <GitHubLogo />{" "}
      <a
        href={`https://github.com/vvo/iron-session/tree/main/examples/next/src/${path}`}
        target="_blank"
        className="underline hover:no-underline"
      >
        Get the code for this example
      </a>
    </div>
  );
}
