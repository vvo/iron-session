import { NextPage } from "next";

const GreetAdmin: NextPage = () => <div>Hello Admin!</div>;
export default GreetAdmin;

// no need to manually check if admin on each page here
// middleware makes life easy!
