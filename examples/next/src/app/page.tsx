'use client'

import Image from 'next/image'
import styles from './page.module.css'
import { useState } from 'react'
import {
  submitCookieToStorageServerAction,
  readCookieFromStorageServerAction,
} from './serverActions'
import {
  submitCookieToStorageRouteHandler,
  readCookieFromStorageRouteHandler
} from './clientActions'

export default function Home() {
  const [currentCookie, setCurrentCookie] = useState('')
  const [readCookieFromStorage, setReadCookieFromStorage] = useState('')
  const handleSubmitCookieViaServerAction = async () => {
    submitCookieToStorageServerAction(currentCookie)
  }
  const handleReadCookieViaServerAction = async () => {
    const cookieFromStorage = await readCookieFromStorageServerAction()
    setReadCookieFromStorage(cookieFromStorage)
  }
  const handleSubmitCookieViaRouteHandler = async () => {
    submitCookieToStorageRouteHandler(currentCookie)
  }
  const handleReadCookieViaRouteHandler = async () => {
    const cookieFromStorage = await readCookieFromStorageRouteHandler()
    setReadCookieFromStorage(cookieFromStorage)
  }
  return (
    <main className={styles.main}>
      <div className={styles.description}>
        <p>
          Current Cookie: &nbsp;
          <input
            type="text"
            id="currentCookie"
            name="currentCookie"
            placeholder="Enter Value Here"
            value={currentCookie}
            onChange={(event) => setCurrentCookie(event.target.value)}
          />
        </p>
        <div>
          <a
            href="https://vercel.com?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            By{' '}
            <Image
              src="/vercel.svg"
              alt="Vercel Logo"
              className={styles.vercelLogo}
              width={100}
              height={24}
              priority
            />
          </a>
        </div>
      </div>
      <div className={styles.center}>
        <Image
          className={styles.logo}
          src="/next.svg"
          alt="Next.js Logo"
          width={180}
          height={37}
          priority
        />
      </div>

      <div className={styles.grid}>
        <div
          className={styles.card}
          onClick={handleSubmitCookieViaServerAction}
        >
          <h2>
            Set Cookie via Server Action <span>-&gt;</span>
          </h2>
          <p>Set Current Cookie:&nbsp;
            <b>{currentCookie || "Not Set Yet"} </b>
            to storage</p>
        </div>

        <div
          className={styles.card}
          onClick={handleReadCookieViaServerAction}
        >
          <h2>
            Read Cookie via Server Action <span>-&gt;</span>
          </h2>
          <p>Read Cookie From Storage:&nbsp;
            <b>{readCookieFromStorage || "Not Read Yet"} </b>
          </p>
        </div>
        <div
          className={styles.card}
          onClick={handleSubmitCookieViaRouteHandler}
        >
          <h2>
            Set Cookie via API Route Handler <span>-&gt;</span>
          </h2>
          <p>Set Current Cookie:&nbsp;
            <b>{currentCookie || "Not Set Yet"} </b>
            to storage</p>
        </div>

        <div
          className={styles.card}
          onClick={handleReadCookieViaRouteHandler}
        >
          <h2>
            Read Cookie via API Route Handler <span>-&gt;</span>
          </h2>
          <p>Read Cookie From Storage:&nbsp;
            <b>{readCookieFromStorage || "Not Read Yet"} </b>
          </p>
        </div>
      </div>
    </main>
  )
}
