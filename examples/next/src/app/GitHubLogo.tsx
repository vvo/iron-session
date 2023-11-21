import Image from "next/image";

export default function GitHubLogo() {
  return (
    <>
      <Image
        src="/github-mark.svg"
        alt="GitHub Logo"
        width={20}
        height={20}
        className="dark:hidden"
      />
      <Image
        src="/github-mark-white.svg"
        alt="GitHub Logo"
        width={20}
        height={20}
        className="hidden dark:block"
      />
    </>
  );
}
