<p align="center">
  <a href="https://github.com/renchris/app-router-iron-session">
    <span style="display: inline-block; vertical-align: middle;">
      <img alt="NextJS App Router Logo" src="public/app-router-and-iron-session-icons.png" width="120" />
    </span>
  </a>
</p>

<h1 align="center">
  App Router With Iron Session
</h1>

A web application that demonstrates a NextJS App Router project writing and reading encrypted cookies to and from the browser's cookie storage using [Iron Session](https://github.com/vvo/iron-session) and App Router's [cookie function](https://nextjs.org/docs/app/api-reference/functions/cookies). This application uses both access methods of [API Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) and [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions).

## 🤝 Iron Session and NextJS

The [Iron Session V8 branch](https://github.com/vvo/iron-session/issues/586) allows Iron Session to be used with the NextJS App Router and (soon) React Server Components.

[renchris' fork of the V8 branch](https://github.com/renchris/iron-session/tree/v8-as-dependency) now allows Iron Session to be used with React Server Components and NextJS Server Actions.

Both the fork of the V8 branch and this project are written for developers to now be able use Iron Session in their NextJS App Router production applications, and additionally, for this to be included in the V8 branch via Pull Request to complete and push V8 into the Iron Session main branch for all developers to use.

## 🚀 Usage

1. **First, run the development server:**

    ```bash
    pnpm dev
    ```

1. **Open the App Router with Iron Session web application.**

    Open [http://localhost:3000](http://localhost:3000) with your browser to see demo application.

1. **Open the cookie storage in your Developer Tools.**

    Right click the page and click "Inspect". From the top menu items, click "Application". On the left panel, under Storage, and under Cookies, click the page URL <http://localhost:3000>. Here you can observe the encrypted cookie being set and read from storage.

1. **Write an encrypted cookie to storage.**

    In the top left 'Current Cookie' text field, type in the string text value of the cookie you wish to set. Then you can click Set Cookie Via Server Action or Set Cookie Via API Route Handler button. You can now see an encrypted string value set in the cookie storage browser in your Developer Tools.

1. **Read the encrypted cookie from storage.**

    Click the Read Cookie Via Server Action or Read Cookie Via API Route Handler button. The encrypted cookie in storage will be decrypted back into the readable string text value you initially set and displayed in the button subtext.

## 🧐 What's inside?

A quick look at the top-level files and directories where we made our feature changes in the project.

    lib
    └── session.ts
    src
    └── app
        ├── api
        |   ├── readIronSessionCookie
        |   |   └── route.ts
        |   └── submitIronSessionCookie
        |       └── route.ts
        ├── clientActions.ts
        ├── page.tsx
        └── serverActions.ts

1. **`/lib/session.ts`**: This file contains the custom session options and session data interface the application will be using Iron Session with. The file then exports the Iron Session session and Iron Session Server Action session to be imported and used by other files.

1. **`/src/app`**: This directory will contain all of the code related to what you will see on the front-end of the site. `src` is a convention for “source code” and `app` is the convention for “app router”.

1. **`/api`**: This directory will contain all of the API Route Handlers: custom request handlers for a given route using the Web Request and Response. Route Handlers are defined in a `route.ts` file

1. **`readIronSessionCookie/route.ts`**: This file contains the API Route Handler that uses Iron Session to read the cookie value from cookie storage.

1. **`submitIronSessionCookie/route.ts`**: This file contains the API Route Handler that uses Iron Session to encrypt and write the current cookie string text value to cookie storage.

1. **`clientActions.ts`**: API Route Handlers need to be called from a client-side environment to be able to interact with client-side data. This "use client" file calls the readIronSessionCookie and submitIronSessionCookie API Route Handlers that write and read data from and to cookie storage in the client-side browser.

1. **`page.tsx`**: This file contains the code for the front-end page. It imports the Server Action functions from the `serverActions.ts` file and the API Route Handler functions from the `clientActions.ts` file which gets invoked on click of the respective button.

1. **`serverActions.ts`**: This file contains the Server Action functions of submitting and reading cookies from using the Iron Session Server Action session.

## 📣 Recognition

Thank you to [@vvo](https://github.com/vvo) and [@brc-dd](https://github.com/brc-dd) for the creation and maintenance of the Iron Session library. Thank you to the NextJS community on Discord, especially [joulev](https://github.com/joulev), and the participants in the Iron Session discussion threads on GitHub for the development support that made creating this project possible.
