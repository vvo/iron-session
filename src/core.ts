import type { IncomingMessage, ServerResponse } from "http";
import { parse, serialize, type CookieSerializeOptions } from "cookie";
import {
	defaults as ironDefaults,
	seal as ironSeal,
	unseal as ironUnseal,
} from "iron-webcrypto";
import { ml_kem512 } from "@noble/post-quantum/ml-kem";
import { randomBytes } from "@noble/hashes/utils";
import { base64url } from "rfc4648";

type PasswordsMap = Record<string, string>;
type Password = PasswordsMap | string;
type RequestType = IncomingMessage | Request;
type ResponseType = Response | ServerResponse;

/**
 * {@link https://wicg.github.io/cookie-store/#dictdef-cookielistitem CookieListItem}
 * as specified by W3C.
 */
interface CookieListItem
	extends Pick<
		CookieSerializeOptions,
		"domain" | "path" | "sameSite" | "secure"
	> {
	/** A string with the name of a cookie. */
	name: string;
	/** A string containing the value of the cookie. */
	value: string;
	/** A number of milliseconds or Date interface containing the expires of the cookie. */
	expires?: CookieSerializeOptions["expires"] | number;
}

/**
 * Superset of {@link CookieListItem} extending it with
 * the `httpOnly`, `maxAge` and `priority` properties.
 */
type ResponseCookie = CookieListItem &
	Pick<CookieSerializeOptions, "httpOnly" | "maxAge" | "priority">;

/**
 * The high-level type definition of the .get() and .set() methods
 * of { cookies() } from "next/headers"
 */
export interface CookieStore {
	get: (name: string) => { name: string; value: string } | undefined;
	set: {
		(name: string, value: string, cookie?: Partial<ResponseCookie>): void;
		(options: ResponseCookie): void;
	};
}

/**
 * Set-Cookie Attributes do not include `encode`. We omit this from our `cookieOptions` type.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie
 * @see https://developer.chrome.com/docs/devtools/application/cookies/
 */
type CookieOptions = Omit<CookieSerializeOptions, "encode">;

export interface SessionOptions {
	/**
	 * The cookie name that will be used inside the browser. Make sure it's unique
	 * given your application.
	 *
	 * @example 'vercel-session'
	 */
	cookieName: string;

	/**
	 * The password(s) that will be used to encrypt the cookie. Can either be a string
	 * or an object.
	 *
	 * When you provide multiple passwords then all of them will be used to decrypt
	 * the cookie. But only the most recent (`= highest key`, `2` in the example)
	 * password will be used to encrypt the cookie. This allows password rotation.
	 *
	 * @example { 1: 'password-1', 2: 'password-2' }
	 */
	password: Password;

	/**
	 * The time (in seconds) that the session will be valid for. Also sets the
	 * `max-age` attribute of the cookie automatically (`= ttl - 60s`, so that the
	 * cookie always expire before the session).
	 *
	 * `ttl = 0` means no expiration.
	 *
	 * @default 1209600
	 */
	ttl?: number;

	/**
	 * The options that will be passed to the cookie library.
	 *
	 * If you want to use "session cookies" (cookies that are deleted when the browser
	 * is closed) then you need to pass `cookieOptions: { maxAge: undefined }`
	 *
	 * @see https://github.com/jshttp/cookie#options-1
	 */
	cookieOptions?: CookieOptions;

	/**
	 * Whether to use post-quantum cryptography for encryption.
	 * Note: This is experimental and may not be compatible with all browsers.
	 *
	 * @default false
	 */
	usePostQuantum?: boolean;
}

export type IronSession<T> = T & {
	/**
	 * Encrypts the session data and sets the cookie.
	 */
	readonly save: () => Promise<void>;

	/**
	 * Destroys the session data and removes the cookie.
	 */
	readonly destroy: () => void;

	/**
	 * Update the session configuration. You still need to call save() to send the new cookie.
	 */
	readonly updateConfig: (newSessionOptions: SessionOptions) => void;
};

// default time allowed to check for iron seal validity when ttl passed
// see https://hapi.dev/module/iron/api/?v=7.0.1#options
const timestampSkewSec = 60;
const fourteenDaysInSeconds = 14 * 24 * 3600;

// We store a token major version to handle data format changes so that the cookies
// can be kept alive between upgrades, no need to disconnect everyone.
const currentMajorVersion = 2;
const versionDelimiter = "~";

// Version for post-quantum cryptography
const pqMajorVersion = 3;

const defaultOptions: Required<
	Pick<SessionOptions, "ttl" | "cookieOptions" | "usePostQuantum">
> = {
	ttl: fourteenDaysInSeconds,
	cookieOptions: { httpOnly: true, secure: true, sameSite: "lax", path: "/" },
	usePostQuantum: false,
};

function normalizeStringPasswordToMap(password: Password): PasswordsMap {
	return typeof password === "string" ? { 1: password } : password;
}

function parseSeal(seal: string): {
	sealWithoutVersion: string;
	tokenVersion: number | null;
} {
	const [sealWithoutVersion, tokenVersionAsString] =
		seal.split(versionDelimiter);
	const tokenVersion =
		tokenVersionAsString == null
			? null
			: Number.parseInt(tokenVersionAsString, 10);

	// Handle the case where sealWithoutVersion could be undefined
	if (sealWithoutVersion === undefined) {
		throw new Error("Invalid seal format: missing seal data");
	}

	return { sealWithoutVersion, tokenVersion };
}

function computeCookieMaxAge(ttl: number): number {
	if (ttl === 0) {
		// ttl = 0 means no expiration
		// but in reality cookies have to expire (can't have no max-age)
		// 2147483647 is the max value for max-age in cookies
		// see https://stackoverflow.com/a/11685301/147079
		return 2147483647;
	}

	// The next line makes sure browser will expire cookies before seals are considered expired by the server.
	// It also allows for clock difference of 60 seconds between server and clients.
	return ttl - timestampSkewSec;
}

function getCookie(req: RequestType, cookieName: string): string {
	return (
		parse(
			("headers" in req && typeof req.headers.get === "function"
				? req.headers.get("cookie")
				: (req as IncomingMessage).headers.cookie) ?? "",
		)[cookieName] ?? ""
	);
}

function getServerActionCookie(
	cookieName: string,
	cookieHandler: CookieStore,
): string {
	const cookieObject = cookieHandler.get(cookieName);
	const cookie = cookieObject?.value;
	if (typeof cookie === "string") {
		return cookie;
	}
	return "";
}

function setCookie(res: ResponseType, cookieValue: string): void {
	if ("headers" in res && typeof res.headers.append === "function") {
		res.headers.append("set-cookie", cookieValue);
		return;
	}
	let existingSetCookie = (res as ServerResponse).getHeader("set-cookie") ?? [];
	if (!Array.isArray(existingSetCookie)) {
		existingSetCookie = [existingSetCookie.toString()];
	}
	(res as ServerResponse).setHeader("set-cookie", [
		...existingSetCookie,
		cookieValue,
	]);
}

// Helper functions for compression using browser's native compression
async function compressData(data: Uint8Array): Promise<Uint8Array> {
	if (typeof CompressionStream === "undefined") {
		// If compression is not available, return the original data
		return data;
	}

	try {
		const cs = new CompressionStream("deflate-raw");
		const writer = cs.writable.getWriter();
		writer.write(data);
		writer.close();

		const output = [];
		const reader = cs.readable.getReader();
		let totalSize = 0;

		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			output.push(value);
			totalSize += value.length;
		}

		// Combine all chunks
		const result = new Uint8Array(totalSize);
		let offset = 0;
		for (const chunk of output) {
			result.set(chunk, offset);
			offset += chunk.length;
		}

		return result;
	} catch (error) {
		console.warn("Compression failed, using uncompressed data", error);
		return data;
	}
}

async function decompressData(data: Uint8Array): Promise<Uint8Array> {
	if (typeof DecompressionStream === "undefined") {
		// If decompression is not available, return the original data
		return data;
	}

	try {
		const ds = new DecompressionStream("deflate-raw");
		const writer = ds.writable.getWriter();
		writer.write(data);
		writer.close();

		const output = [];
		const reader = ds.readable.getReader();
		let totalSize = 0;

		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			output.push(value);
			totalSize += value.length;
		}

		// Combine all chunks
		const result = new Uint8Array(totalSize);
		let offset = 0;
		for (const chunk of output) {
			result.set(chunk, offset);
			offset += chunk.length;
		}

		return result;
	} catch (error) {
		console.warn("Decompression failed, using compressed data as-is", error);
		return data;
	}
}

interface PQSealResult {
	ct: string; // ciphertext
	pk: string; // publicKey
	kc: string; // kemCiphertext
	iv: string; // initialization vector
	cm?: boolean; // compressed flag
	pqv?: string; // ML-KEM version identifier
}

// For backward compatibility with old format
interface LegacyPQSealResult {
	ciphertext: string;
	publicKey: string;
	kemCiphertext: string;
	iv: string;
	compressed?: boolean;
	pqVersion?: string; // ML-KEM version identifier
}

// Type guard to check if it's the legacy format
function isLegacyFormat(obj: unknown): obj is LegacyPQSealResult {
	return (
		typeof obj === "object" &&
		obj !== null &&
		("ciphertext" in obj || "publicKey" in obj || "kemCiphertext" in obj)
	);
}

// Constants for ML-KEM expected sizes
const ML_KEM_SIZES = {
	"512": {
		publicKey: 800,
		ciphertext: 768,
		secretKey: 1632,
	},
	"768": {
		publicKey: 1184,
		ciphertext: 1088,
		secretKey: 2400,
	},
	"1024": {
		publicKey: 1568,
		ciphertext: 1568,
		secretKey: 3168,
	},
};

// Gets the ML-KEM version based on publicKey/ciphertext lengths
function detectMLKEMVersion(
	publicKey: Uint8Array,
	ciphertext: Uint8Array,
): string {
	for (const [version, sizes] of Object.entries(ML_KEM_SIZES)) {
		if (
			publicKey.length === sizes.publicKey &&
			ciphertext.length === sizes.ciphertext
		) {
			return version;
		}
	}

	return "512"; // Default to 512 if can't detect
}

export function createSealData(_crypto: Crypto) {
	return async function sealData(
		data: unknown,
		{
			password,
			ttl = fourteenDaysInSeconds,
			usePostQuantum = false,
		}: { password: Password; ttl?: number; usePostQuantum?: boolean },
	): Promise<string> {
		// Use post-quantum cryptography if specified
		if (usePostQuantum) {
			try {
				// Generate ML-KEM key pair (using 512 for smallest size)
				// Use a deterministic seed derived from the password to generate the key pair
				// This allows us to regenerate the same key pair during decapsulation
				const passwordsMap = normalizeStringPasswordToMap(password);
				const passwordIds = Object.keys(passwordsMap)
					.map(Number)
					.filter((id) => !Number.isNaN(id));

				if (passwordIds.length === 0) {
					throw new Error("iron-session: No valid password IDs found.");
				}

				const mostRecentPasswordId = Math.max(...passwordIds);
				const secret = passwordsMap[mostRecentPasswordId.toString()];
				if (!secret) {
					throw new Error("iron-session: Password not found for the given ID.");
				}

				// Create a deterministic seed using the password
				// Noble Post-Quantum expects a 64-byte seed
				const passwordBytes = new TextEncoder().encode(secret);
				const kemSeed = new Uint8Array(64);
				for (let i = 0; i < 64; i++) {
					// Simple way to derive 64 bytes from the password
					kemSeed[i] = passwordBytes[i % passwordBytes.length] || 0;
				}

				// We only need the publicKey for encryption
				const { publicKey } = ml_kem512.keygen(kemSeed);

				// Encapsulate a shared secret
				const { cipherText, sharedSecret } = ml_kem512.encapsulate(publicKey);

				// Store ML-KEM version for later decapsulation
				const mlkemVersion = "512";

				// Prepare data for encryption
				const dataBytes =
					data instanceof Uint8Array
						? data
						: new TextEncoder().encode(JSON.stringify(data));

				// Compress the data before encryption
				const compressedData = await compressData(dataBytes);
				const useCompression = compressedData.length < dataBytes.length;
				const finalData = useCompression ? compressedData : dataBytes;

				// Encrypt data with AES-GCM using shared secret
				const iv = randomBytes(12);
				const encryptedData = await _crypto.subtle.encrypt(
					{
						name: "AES-GCM",
						iv,
					},
					await _crypto.subtle.importKey(
						"raw",
						sharedSecret,
						{ name: "AES-GCM", length: 256 },
						false,
						["encrypt"],
					),
					finalData,
				);

				// Combine all components using a more compact format
				const seal: PQSealResult = {
					ct: base64url.stringify(new Uint8Array(encryptedData)),
					pk: base64url.stringify(publicKey),
					kc: base64url.stringify(cipherText),
					iv: base64url.stringify(iv),
					pqv: mlkemVersion,
				};

				// Only include compressed flag if true
				if (useCompression) {
					seal.cm = true;
				}

				const sealString = base64url.stringify(
					new TextEncoder().encode(JSON.stringify(seal)),
				);

				// Log cookie size for debugging
				console.log(`Post-quantum cookie size: ${sealString.length} bytes`);

				// Check cookie length before returning
				if (sealString.length > 4096) {
					throw new Error("Cookie length is too big");
				}

				return `${sealString}${versionDelimiter}${pqMajorVersion}`;
			} catch (error) {
				console.error(
					"Post-quantum encryption failed, falling back to iron-webcrypto",
					error,
				);
				// Fall back to iron-webcrypto if post-quantum fails
			}
		}

		// Use iron-webcrypto (original implementation)
		const passwordsMap = normalizeStringPasswordToMap(password);

		const passwordIds = Object.keys(passwordsMap)
			.map(Number)
			.filter((id) => !Number.isNaN(id));
		if (passwordIds.length === 0) {
			throw new Error("iron-session: No valid password IDs found.");
		}
		const mostRecentPasswordId = Math.max(...passwordIds);
		const secret = passwordsMap[mostRecentPasswordId.toString()];

		// Ensure we have a valid password
		if (!secret) {
			throw new Error("iron-session: Password not found for the given ID.");
		}

		const passwordForSeal = {
			id: mostRecentPasswordId.toString(),
			secret,
		};

		const seal = await ironSeal(_crypto, data, passwordForSeal, {
			...ironDefaults,
			ttl: ttl * 1000,
		});

		return `${seal}${versionDelimiter}${currentMajorVersion}`;
	};
}

export function createUnsealData(_crypto: Crypto) {
	return async function unsealData<T>(
		seal: string,
		{
			password,
			ttl = fourteenDaysInSeconds,
			usePostQuantum = false,
		}: { password: Password; ttl?: number; usePostQuantum?: boolean },
	): Promise<T> {
		const passwordsMap = normalizeStringPasswordToMap(password);
		const { sealWithoutVersion, tokenVersion } = parseSeal(seal);

		// Handle post-quantum seal (version 3)
		if (tokenVersion === pqMajorVersion) {
			if (!usePostQuantum) {
				console.warn(
					"Post-quantum seal detected but usePostQuantum is false, " +
						"attempting decryption anyway",
				);
			}
			try {
				const parsedData = JSON.parse(
					new TextDecoder().decode(base64url.parse(sealWithoutVersion)),
				);

				// Handle both new and legacy formats
				let ciphertext: Uint8Array;
				let publicKey: Uint8Array;
				let kemCiphertext: Uint8Array;
				let iv: Uint8Array;
				let isCompressed: boolean;
				let pqVersion: string;

				if (isLegacyFormat(parsedData)) {
					// Legacy format
					ciphertext = base64url.parse(parsedData.ciphertext);
					publicKey = base64url.parse(parsedData.publicKey);
					kemCiphertext = base64url.parse(parsedData.kemCiphertext || "");
					iv = base64url.parse(parsedData.iv);
					isCompressed = !!parsedData.compressed;
					pqVersion =
						parsedData.pqVersion ||
						detectMLKEMVersion(publicKey, kemCiphertext);
				} else {
					// New format
					const sealData = parsedData as PQSealResult;
					ciphertext = base64url.parse(sealData.ct);
					publicKey = base64url.parse(sealData.pk);
					kemCiphertext = base64url.parse(sealData.kc);
					iv = base64url.parse(sealData.iv);
					isCompressed = !!sealData.cm;
					pqVersion =
						sealData.pqv || detectMLKEMVersion(publicKey, kemCiphertext);
				}

				// If kemCiphertext is missing, return empty object
				if (!kemCiphertext.length) {
					console.error(
						"Post-quantum decryption failed: missing KEM ciphertext",
					);
					return {} as T;
				}

				console.log(`Detected ML-KEM version: ${pqVersion}`);
				console.log(
					`Public key length: ${publicKey.length}, Ciphertext length: ${kemCiphertext.length}`,
				);

				// Check if parameters match expected sizes
				if (
					publicKey.length !==
						ML_KEM_SIZES[pqVersion as keyof typeof ML_KEM_SIZES]?.publicKey ||
					kemCiphertext.length !==
						ML_KEM_SIZES[pqVersion as keyof typeof ML_KEM_SIZES]?.ciphertext
				) {
					console.warn(
						`ML-KEM parameter size mismatch. Expected publicKey: ${
							ML_KEM_SIZES[pqVersion as keyof typeof ML_KEM_SIZES]?.publicKey
						}, ciphertext: ${
							ML_KEM_SIZES[pqVersion as keyof typeof ML_KEM_SIZES]?.ciphertext
						}, got publicKey: ${publicKey.length}, ciphertext: ${kemCiphertext.length}`,
					);
				}

				// Use try-catch for specific decapsulation errors
				let sharedSecret: Uint8Array;
				try {
					// In ML-KEM, we need to regenerate the same key pair using the same seed
					// derived from the password
					const passwordsMap = normalizeStringPasswordToMap(password);
					const passwordIds = Object.keys(passwordsMap)
						.map(Number)
						.filter((id) => !Number.isNaN(id));
					if (passwordIds.length === 0) {
						throw new Error("iron-session: No valid password IDs found.");
					}
					const mostRecentPasswordId = Math.max(...passwordIds);
					const secret = passwordsMap[mostRecentPasswordId.toString()];
					if (!secret) {
						throw new Error(
							"iron-session: Password not found for the given ID.",
						);
					}

					// Create a deterministic seed using the password - same as in sealData
					const passwordBytes = new TextEncoder().encode(secret);
					const kemSeed = new Uint8Array(64);
					for (let i = 0; i < 64; i++) {
						kemSeed[i] = passwordBytes[i % passwordBytes.length] || 0;
					}

					// Regenerate the key pair - this should produce the same keys as during encryption
					const { secretKey } = ml_kem512.keygen(kemSeed);

					// Now we can properly decapsulate with correct parameter order:
					// The Noble Post-Quantum API expects (cipherText, secretKey) order
					sharedSecret = ml_kem512.decapsulate(kemCiphertext, secretKey);
				} catch (decapError) {
					console.error("ML-KEM decapsulation failed:", decapError);
					return {} as T;
				}

				// Decrypt data
				const decryptedData = await _crypto.subtle.decrypt(
					{
						name: "AES-GCM",
						iv,
					},
					await _crypto.subtle.importKey(
						"raw",
						sharedSecret,
						{ name: "AES-GCM", length: 256 },
						false,
						["decrypt"],
					),
					ciphertext,
				);

				// Decompress if it was compressed
				const finalData = isCompressed
					? await decompressData(new Uint8Array(decryptedData))
					: new Uint8Array(decryptedData);

				// Try to parse as JSON first, if it fails return as Uint8Array
				try {
					return JSON.parse(new TextDecoder().decode(finalData)) as T;
				} catch {
					return finalData as unknown as T;
				}
			} catch (error) {
				// If post-quantum unseal fails, return empty object
				console.error("Post-quantum decryption failed:", error);
				return {} as T;
			}
		}

		// Handle iron-webcrypto seal (version 2 or null)
		try {
			const data =
				(await ironUnseal(_crypto, sealWithoutVersion, passwordsMap, {
					...ironDefaults,
					ttl: ttl * 1000,
				})) ?? {};

			if (tokenVersion === 2) {
				return data as T;
			}

			// @ts-expect-error `persistent` does not exist on newer tokens
			return { ...data.persistent } as T;
		} catch (error) {
			if (
				error instanceof Error &&
				/^(Expired seal|Bad hmac value|Cannot find password|Incorrect number of sealed components)/.test(
					error.message,
				)
			) {
				// if seal expired or
				// if seal is not valid (encrypted using a different password, when passwords are badly rotated) or
				// if we can't find back the password in the seal
				// then we just start a new session over
				return {} as T;
			}

			throw error;
		}
	};
}

function getSessionConfig(
	sessionOptions: SessionOptions,
): Required<SessionOptions> {
	const options = {
		...defaultOptions,
		...sessionOptions,
		cookieOptions: {
			...defaultOptions.cookieOptions,
			...(sessionOptions.cookieOptions || {}),
		},
	};

	if (
		sessionOptions.cookieOptions &&
		"maxAge" in sessionOptions.cookieOptions
	) {
		if (sessionOptions.cookieOptions.maxAge === undefined) {
			// session cookies, do not set maxAge, consider token as infinite
			options.ttl = 0;
		}
	} else {
		options.cookieOptions.maxAge = computeCookieMaxAge(options.ttl);
	}

	return options;
}

const badUsageMessage =
	"iron-session: Bad usage: use getIronSession(req, res, options) or getIronSession(cookieStore, options).";

export function createGetIronSession(
	sealData: ReturnType<typeof createSealData>,
	unsealData: ReturnType<typeof createUnsealData>,
) {
	return getIronSession;

	async function getIronSession<T extends object>(
		cookies: CookieStore,
		sessionOptions: SessionOptions,
	): Promise<IronSession<T>>;
	async function getIronSession<T extends object>(
		req: RequestType,
		res: ResponseType,
		sessionOptions: SessionOptions,
	): Promise<IronSession<T>>;
	async function getIronSession<T extends object>(
		reqOrCookieStore: RequestType | CookieStore,
		resOrsessionOptions: ResponseType | SessionOptions,
		sessionOptions?: SessionOptions,
	): Promise<IronSession<T>> {
		if (!reqOrCookieStore) {
			throw new Error(badUsageMessage);
		}

		if (!resOrsessionOptions) {
			throw new Error(badUsageMessage);
		}

		if (!sessionOptions) {
			return getIronSessionFromCookieStore<T>(
				reqOrCookieStore as CookieStore,
				resOrsessionOptions as SessionOptions,
				sealData,
				unsealData,
			);
		}

		const req = reqOrCookieStore as RequestType;
		const res = resOrsessionOptions as ResponseType;

		if (!sessionOptions) {
			throw new Error(badUsageMessage);
		}

		if (!sessionOptions.cookieName) {
			throw new Error("iron-session: Bad usage. Missing cookie name.");
		}

		if (!sessionOptions.password) {
			throw new Error("iron-session: Bad usage. Missing password.");
		}

		const passwordsMap = normalizeStringPasswordToMap(sessionOptions.password);

		if (Object.values(passwordsMap).some((password) => password.length < 32)) {
			throw new Error(
				"iron-session: Bad usage. Password must be at least 32 characters long.",
			);
		}

		let sessionConfig = getSessionConfig(sessionOptions);

		const sealFromCookies = getCookie(req, sessionConfig.cookieName);
		const session = sealFromCookies
			? await unsealData<T>(sealFromCookies, {
					password: passwordsMap,
					ttl: sessionConfig.ttl,
					usePostQuantum: sessionConfig.usePostQuantum,
				})
			: ({} as T);

		Object.defineProperties(session, {
			updateConfig: {
				value: function updateConfig(newSessionOptions: SessionOptions) {
					sessionConfig = getSessionConfig(newSessionOptions);
				},
			},
			save: {
				value: async function save() {
					if ("headersSent" in res && res.headersSent) {
						throw new Error(
							"iron-session: Cannot set session cookie: session.save() was called after headers were sent. Make sure to call it before any res.send() or res.end()",
						);
					}

					const seal = await sealData(session, {
						password: passwordsMap,
						ttl: sessionConfig.ttl,
						usePostQuantum: sessionConfig.usePostQuantum,
					});
					const cookieValue = serialize(
						sessionConfig.cookieName,
						seal,
						sessionConfig.cookieOptions,
					);

					if (cookieValue.length > 4096) {
						throw new Error(
							`iron-session: Cookie length is too big (${cookieValue.length} bytes), browsers will refuse it. Try to remove some data.`,
						);
					}

					setCookie(res, cookieValue);
				},
			},

			destroy: {
				value: function destroy() {
					for (const key of Object.keys(session)) {
						delete (session as Record<string, unknown>)[key];
					}
					const cookieValue = serialize(sessionConfig.cookieName, "", {
						...sessionConfig.cookieOptions,
						maxAge: 0,
					});

					setCookie(res, cookieValue);
				},
			},
		});

		return session as IronSession<T>;
	}
}

async function getIronSessionFromCookieStore<T extends object>(
	cookieStore: CookieStore,
	sessionOptions: SessionOptions,
	sealData: ReturnType<typeof createSealData>,
	unsealData: ReturnType<typeof createUnsealData>,
): Promise<IronSession<T>> {
	if (!sessionOptions.cookieName) {
		throw new Error("iron-session: Bad usage. Missing cookie name.");
	}

	if (!sessionOptions.password) {
		throw new Error("iron-session: Bad usage. Missing password.");
	}

	const passwordsMap = normalizeStringPasswordToMap(sessionOptions.password);

	if (Object.values(passwordsMap).some((password) => password.length < 32)) {
		throw new Error(
			"iron-session: Bad usage. Password must be at least 32 characters long.",
		);
	}

	let sessionConfig = getSessionConfig(sessionOptions);
	const sealFromCookies = getServerActionCookie(
		sessionConfig.cookieName,
		cookieStore,
	);
	const session = sealFromCookies
		? await unsealData<T>(sealFromCookies, {
				password: passwordsMap,
				ttl: sessionConfig.ttl,
				usePostQuantum: sessionConfig.usePostQuantum,
			})
		: ({} as T);

	Object.defineProperties(session, {
		updateConfig: {
			value: function updateConfig(newSessionOptions: SessionOptions) {
				sessionConfig = getSessionConfig(newSessionOptions);
			},
		},
		save: {
			value: async function save() {
				const seal = await sealData(session, {
					password: passwordsMap,
					ttl: sessionConfig.ttl,
					usePostQuantum: sessionConfig.usePostQuantum,
				});

				const cookieLength =
					sessionConfig.cookieName.length +
					seal.length +
					JSON.stringify(sessionConfig.cookieOptions).length;

				if (cookieLength > 4096) {
					throw new Error(
						`iron-session: Cookie length is too big (${cookieLength} bytes), browsers will refuse it. Try to remove some data.`,
					);
				}

				cookieStore.set(
					sessionConfig.cookieName,
					seal,
					sessionConfig.cookieOptions,
				);
			},
		},

		destroy: {
			value: function destroy() {
				for (const key of Object.keys(session)) {
					delete (session as Record<string, unknown>)[key];
				}

				const cookieOptions = { ...sessionConfig.cookieOptions, maxAge: 0 };
				cookieStore.set(sessionConfig.cookieName, "", cookieOptions);
			},
		},
	});

	return session as IronSession<T>;
}
