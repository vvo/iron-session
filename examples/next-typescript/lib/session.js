// this file is a wrapper with defaults to be used in both API routes and `getServerSideProps` functions
import { Handler, Session, withIronSession } from "next-iron-session";

// optionally add stronger typing for next-specific implementation
interface NextIronSessionHandler extends Handler {
  session: Session;
}

// <Req, Res> = (
//   req: NextApiRequest & { session: Session },
//   res: NextApiResponse & { session: Session},
// ) => any;

const withSession: NextIronSessionHandler = () =>
  withIronSession(handler, {
    password: process.env.SECRET_COOKIE_PASSWORD,
    cookieName: "next-iron-session/examples/next.js",
    cookieOptions: {
      // the next line allows to use the session in non-https environments like
      // Next.js dev mode (http://localhost:3000)
      secure: process.env.NODE_ENV === "production",
    },
  });

export default function withSession(handler) {
  return;
}
