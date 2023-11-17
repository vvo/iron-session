import Link from "next/link";
import * as css from "@/app/css";

export function Title({
  category = "App router",
  subtitle,
}: {
  category?: string;
  subtitle: JSX.Element | string;
}) {
  return (
    <div>
      <h1 className="text-2xl">
        🔐{" "}
        <Link className={css.link} href="/">
          iron-session
        </Link>{" "}
        examples: {category}{" "}
      </h1>
      <h2 className="text-xl text-gray-500">{subtitle}</h2>
    </div>
  );
}
