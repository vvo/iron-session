# iron-session

A runtime-agnostic stateless session utility. Works with Next.js, Node.js, Deno,
Bun, and more.

The session data is stored in signed and encrypted cookies ("seals") which can
only be decoded by your server. There are no session ids, making sessions
"stateless" from the server point of view. This strategy of storing session data
is the same technique used by frameworks like
[Ruby On Rails](https://guides.rubyonrails.org/security.html#session-storage).

## Table of Contents

<!-- - [Features](#features) -->

- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
  <!-- - [Options](#options)  -->
  <!-- - [Examples](#examples) -->
- [FAQ](#faq)
  <!-- - [Contributing](#contributing) -->
  <!-- - [License](#license) -->
- [Credits](#credits)
- [Good Reads](#good-reads)

## Installation

```sh
npm add iron-session
```

Change the package manager to whatever you use, of course. On Deno, you can use
[esm.sh](https://esm.sh/):

```js
import { getIronSession } from 'https://esm.sh/iron-session@latest'
```

## Usage

Refer [examples](examples).

## API

WIP

## FAQ

WIP

## Credits

- [Eran Hammer and hapi.js contributors](https://github.com/hapijs/iron/graphs/contributors)
  for creating the underlying cryptography library
  [`@hapi/iron`](https://hapi.dev/module/iron/).
- [Divyansh Singh](https://github.com/brc-dd) for reimplementing `@hapi/iron` as
  [`iron-webcrypto`](https://github.com/brc-dd/iron-webcrypto) using standard
  web APIs.
- [Hoang Vo](https://github.com/hoangvvo) for advice and guidance while building
  this module. Hoang built
  [next-connect](https://github.com/hoangvvo/next-connect) and
  [next-session](https://github.com/hoangvvo/next-session).
- All the
  [contributors](https://github.com/vvo/iron-session/graphs/contributors) for
  making this project better.

## Good Reads

- <https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html>
- <https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html>
