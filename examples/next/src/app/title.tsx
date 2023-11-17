import Link from "next/link";
import * as css from "@/app/css";
import Image from "next/image";

export function Title({
  category = "App router",
  subtitle,
}: {
  category?: string;
  subtitle: JSX.Element | string;
}) {
  return (
    <div>
      <h1>
        <div className="flex items-center gap-2">
          <div className="text-2xl">
            🔐{" "}
            <Link className={css.link} href="/">
              iron-session
            </Link>{" "}
            <span className="text-gray-700">examples: {category}</span>
          </div>
          <span className="text-gray-300 text-xl"> | </span>
          <div>
            <div className="flex items-center gap-2 text-md">
              <Image
                src="/github-mark.svg"
                alt="GitHub Logo"
                width={20}
                height={20}
              />{" "}
              <a
                href="https://github.com/vvo/iron-session"
                target="_blank"
                className="text-gray-700 underline hover:no-underline"
              >
                vvo/iron-session
              </a>
            </div>
          </div>
        </div>
      </h1>
      <h2 className="text-lg text-gray-500">{subtitle}</h2>
    </div>
  );
}
