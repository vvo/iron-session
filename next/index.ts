import type {
  NextApiHandler,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
} from "next";
import type { IronSessionOptions } from "iron-session";
import { getIronSession } from "iron-session";
import getPropertyDescriptorForReqSession from "../src/getPropertyDescriptorForReqSession";

export function withIronSessionApiRoute(
  handler: NextApiHandler,
  options: IronSessionOptions,
): NextApiHandler {
  return async function nextApiHandlerWrappedWithIronSession(req, res) {
    const session = await getIronSession(req, res, options);

    // we define req.session as being enumerable (so console.log(req) shows it)
    // and we also want to allow people to do:
    // req.session = { admin: true }; or req.session = {...req.session, admin: true};
    // req.session.save();
    Object.defineProperty(
      req,
      "session",
      getPropertyDescriptorForReqSession(session),
    );
    return handler(req, res);
  };
}

export function withIronSessionSsr<
  P extends { [key: string]: unknown } = { [key: string]: unknown },
>(
  handler: (
    context: GetServerSidePropsContext,
  ) => GetServerSidePropsResult<P> | Promise<GetServerSidePropsResult<P>>,
  options: IronSessionOptions,
) {
  return async function nextGetServerSidePropsHandlerWrappedWithIronSession(
    context: GetServerSidePropsContext,
  ) {
    const session = await getIronSession(context.req, context.res, options);
    Object.defineProperty(
      context.req,
      "session",
      getPropertyDescriptorForReqSession(session),
    );
    return handler(context);
  };
}
