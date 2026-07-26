import supertest from "supertest"

import { createApp } from "../../src/app"

export type Agent = ReturnType<typeof supertest.agent>

export function makeAgent(): Agent {
  return supertest.agent(createApp())
}

export const XHR = { "X-Requested-With": "XMLHttpRequest" } as const
