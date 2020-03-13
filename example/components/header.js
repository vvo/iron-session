import React from "react";
import Link from "next/link";
import useUser from "../lib/hooks/useUser";
import { mutate } from "swr";

const Header = () => {
  const user = useUser();
  return (
    <header>
      <nav>
        <ul>
          <li>
            <Link href="/">
              <a>Home</a>
            </Link>
          </li>
          {!user?.isLoggedIn && (
            <li>
              <Link href="/login">
                <a>Login</a>
              </Link>
            </li>
          )}
          {user?.isLoggedIn && (
            <>
              {" "}
              <li>
                <Link href="/profile">
                  <a>
                    <img src={user.avatarUrl} width={20} height={20} /> Profile
                  </a>
                </Link>
              </li>
              <li>
                <a
                  href="/api/logout"
                  onClick={async (e) => {
                    e.preventDefault();
                    await fetch("/api/logout");
                    // tell all SWRs with this key to revalidate
                    mutate("/api/user", { isLoggedIn: false });
                  }}
                >
                  Logout
                </a>
              </li>{" "}
            </>
          )}
        </ul>
      </nav>
      <style jsx>{`
        ul {
          display: flex;
          list-style: none;
          margin-left: 0;
          padding-left: 0;
        }

        li {
          margin-right: 1rem;
          display: flex;
        }

        li:first-child {
          margin-left: auto;
        }

        a {
          color: #fff;
          text-decoration: none;
          display: flex;
          align-items: center;
        }

        a img {
          margin-right: 1em;
        }

        header {
          padding: 0.2rem;
          color: #fff;
          background-color: #333;
        }
      `}</style>
    </header>
  );
};

export default Header;
