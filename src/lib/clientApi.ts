"use client";

/** Thin fetch helpers for client components; throws Error with the API message. */

async function parse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

export function getJSON<T>(url: string): Promise<T> {
  return fetch(url).then((r) => parse<T>(r));
}

export function postJSON<T>(url: string, body: unknown): Promise<T> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => parse<T>(r));
}

export function patchJSON<T>(url: string, body: unknown): Promise<T> {
  return fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => parse<T>(r));
}

export function del<T>(url: string): Promise<T> {
  return fetch(url, { method: "DELETE" }).then((r) => parse<T>(r));
}

export function upload<T>(url: string, form: FormData): Promise<T> {
  return fetch(url, { method: "POST", body: form }).then((r) => parse<T>(r));
}
