import { describe, expect, it } from "vitest"

import { makeUser } from "../../../test/fixtures/user"
import { makeAgent, XHR } from "../../../test/helpers/http-client"

describe("auth routes", () => {
  it("registers a new user, sets a session, and returns MeResponse", async () => {
    const agent = makeAgent()
    const res = await agent.post("/auth/register").set(XHR).send({
      email: "newbie@test.local",
      password: "supersecret1",
      displayName: "Newbie",
    })

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      email: "newbie@test.local",
      displayName: "Newbie",
      role: "EMPLOYEE",
      givingBudgetRemaining: 200,
      earnedBalance: 0,
    })

    const me = await agent.get("/auth/me").set(XHR)
    expect(me.status).toBe(200)
    expect(me.body.data.email).toBe("newbie@test.local")
  })

  it("rejects duplicate email with EMAIL_TAKEN", async () => {
    await makeUser({ email: "dup@test.local" })
    const agent = makeAgent()
    const res = await agent.post("/auth/register").set(XHR).send({
      email: "dup@test.local",
      password: "supersecret1",
      displayName: "X",
    })

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe("EMAIL_TAKEN")
  })

  it("logs in with correct credentials and rejects wrong password", async () => {
    await makeUser({ email: "login@test.local", password: "rightpass99" })
    const agent = makeAgent()

    const bad = await agent
      .post("/auth/login")
      .set(XHR)
      .send({ email: "login@test.local", password: "wrongpass99" })
    expect(bad.status).toBe(401)
    expect(bad.body.error.code).toBe("INVALID_CREDENTIALS")

    const good = await agent
      .post("/auth/login")
      .set(XHR)
      .send({ email: "login@test.local", password: "rightpass99" })
    expect(good.status).toBe(200)
    expect(good.body.data.email).toBe("login@test.local")

    const me = await agent.get("/auth/me").set(XHR)
    expect(me.status).toBe(200)
  })

  it("logs out and clears session", async () => {
    await makeUser({ email: "logout@test.local", password: "rightpass99" })
    const agent = makeAgent()
    await agent
      .post("/auth/login")
      .set(XHR)
      .send({ email: "logout@test.local", password: "rightpass99" })

    const logout = await agent.post("/auth/logout").set(XHR)
    expect(logout.status).toBe(204)

    const me = await agent.get("/auth/me").set(XHR)
    expect(me.status).toBe(401)
    expect(me.body.error.code).toBe("UNAUTHENTICATED")
  })

  it("rejects requests missing X-Requested-With", async () => {
    const agent = makeAgent()
    const res = await agent.post("/auth/register").send({
      email: "no-xhr@test.local",
      password: "supersecret1",
      displayName: "X",
    })
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe("FORBIDDEN")
  })

  it("returns validation errors with per-field messages", async () => {
    const agent = makeAgent()
    const res = await agent
      .post("/auth/register")
      .set(XHR)
      .send({ email: "not-an-email", password: "short", displayName: "" })
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe("VALIDATION_FAILED")
    expect(res.body.error.fields).toBeDefined()
  })
})
