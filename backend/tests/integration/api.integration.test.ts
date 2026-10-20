import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import bcrypt from "bcrypt";
import app from "../../src/app";
import { prisma } from "../../src/utils/prisma";
import { generateToken } from "../../src/utils/jwt.util";

/* ==========================================
   1. SERVEUR DE TEST
   ========================================== */

let server: Server;
let baseUrl: string;

/* ==========================================
   2. DONNÉES DE TEST
   ========================================== */

const ADMIN_EMAIL = "it-admin@yoga-test.com";
const USER_EMAIL = "it-user@yoga-test.com";
const PASSWORD = "password123";

let userId: number;
let teacherId: number;
let adminToken: string;
let userToken: string;

// On trace les emails créés pour ne nettoyer QUE ça à la fin
const createdEmails = new Set<string>([ADMIN_EMAIL, USER_EMAIL]);

function authHeader(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function createSession(name = "IT Session") {
  return prisma.session.create({
    data: {
      name,
      date: new Date("2026-12-15T10:00:00.000Z"),
      description: "Session créée par les tests d'intégration",
      teacherId,
    },
  });
}

/* ==========================================
   3. CYCLE DE VIE
   ========================================== */

beforeAll(async () => {
  // Port 0 = l'OS choisit un port libre (pas de conflit avec le 8080)
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Impossible de récupérer le port du serveur de test");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;

  const password = await bcrypt.hash(PASSWORD, 10);

  const teacher = await prisma.teacher.create({
    data: { firstName: "IT", lastName: "Teacher" },
  });
  teacherId = teacher.id;

  // upsert = idempotent : pas d'erreur si un run précédent a laissé des données
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      password,
      firstName: "Admin",
      lastName: "IT",
      admin: true,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: USER_EMAIL },
    update: {},
    create: {
      email: USER_EMAIL,
      password,
      firstName: "User",
      lastName: "IT",
      admin: false,
    },
  });

  userId = user.id;
  adminToken = generateToken(admin.id);
  userToken = generateToken(user.id);
});

beforeEach(async () => {
  // On garde admin / user / teacher, on vide seulement les sessions
  await prisma.session.deleteMany();
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );

  // Nettoyage CIBLÉ : on ne touche pas aux comptes du seed
  await prisma.session.deleteMany();
  await prisma.user.deleteMany({
    where: { email: { in: [...createdEmails] } },
  });
  await prisma.teacher.deleteMany({ where: { id: teacherId } });
  await prisma.$disconnect();
});

/* ==========================================
   4. TESTS — AUTHENTIFICATION
   ========================================== */

describe("Auth — intégration", () => {
  it("POST /register crée un utilisateur en base et renvoie un token", async () => {
    const email = `it-new-${Date.now()}@yoga-test.com`;
    createdEmails.add(email);

    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: PASSWORD,
        firstName: "New",
        lastName: "User",
      }),
    });

    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.token).toEqual(expect.any(String));
    expect(body.email).toBe(email);
    expect(body).not.toHaveProperty("password");

    // Preuve d'intégration : la donnée est vraiment en base
    const inDb = await prisma.user.findUnique({ where: { email } });
    expect(inDb).not.toBeNull();
    expect(inDb?.admin).toBe(false);
  });

  it("POST /login authentifie un utilisateur existant", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: USER_EMAIL, password: PASSWORD }),
    });

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.token).toEqual(expect.any(String));
    expect(body).not.toHaveProperty("password");
  });

  it("POST /login renvoie 401 avec un mauvais mot de passe", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: USER_EMAIL, password: "wrong-password" }),
    });

    expect(res.status).toBe(401);
  });
});

/* ==========================================
   5. TESTS — MIDDLEWARE D'AUTHENTIFICATION
   ========================================== */

describe("AuthMiddleware — intégration", () => {
  it("GET /session renvoie 401 sans token", async () => {
    const res = await fetch(`${baseUrl}/api/session`);
    expect(res.status).toBe(401);
  });

  it("GET /session renvoie 200 avec un token valide", async () => {
    const res = await fetch(`${baseUrl}/api/session`, {
      headers: authHeader(userToken),
    });

    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });
});

/* ==========================================
   6. TESTS — CRUD SESSION (ADMIN)
   ========================================== */

describe("Sessions — intégration", () => {
  it("POST crée une session et la relie au professeur", async () => {
    const res = await fetch(`${baseUrl}/api/session`, {
      method: "POST",
      headers: authHeader(adminToken),
      body: JSON.stringify({
        name: "Yoga du matin",
        date: "2026-12-01T10:00:00.000Z",
        description: "Session de test",
        teacherId,
      }),
    });

    expect(res.status).toBe(201);

    const inDb = await prisma.session.findFirst({
      where: { name: "Yoga du matin" },
      include: { teacher: true },
    });

    expect(inDb).not.toBeNull();
    expect(inDb?.teacher.id).toBe(teacherId);
  });

  it("PUT modifie la session en base", async () => {
    const session = await createSession("Avant modification");

    const res = await fetch(`${baseUrl}/api/session/${session.id}`, {
      method: "PUT",
      headers: authHeader(adminToken),
      body: JSON.stringify({
        name: "Après modification",
        date: "2026-12-20T10:00:00.000Z",
        description: "Description modifiée",
        teacherId,
      }),
    });

    expect(res.status).toBe(200);

    const inDb = await prisma.session.findUnique({
      where: { id: session.id },
    });
    expect(inDb?.name).toBe("Après modification");
  });

  it("DELETE supprime la session de la base", async () => {
    const session = await createSession();

    const res = await fetch(`${baseUrl}/api/session/${session.id}`, {
      method: "DELETE",
      headers: authHeader(adminToken),
    });

    expect([200, 204]).toContain(res.status);

    const inDb = await prisma.session.findUnique({
      where: { id: session.id },
    });
    expect(inDb).toBeNull();
  });
});

/* ==========================================
   7. TESTS — PARTICIPATION (LE FLUX MÉTIER)
   ========================================== */

describe("Participation — intégration", () => {
  it("POST ajoute l'utilisateur aux participants", async () => {
    const session = await createSession();

    const res = await fetch(
      `${baseUrl}/api/session/${session.id}/participate/${userId}`,
      {
        method: "POST",
        headers: authHeader(userToken),
      },
    );

    expect(res.ok).toBe(true);

    // ✅ La relation s'appelle "participants" et contient des SessionParticipation
    const inDb = await prisma.session.findUnique({
      where: { id: session.id },
      include: {
        participants: {
          include: { user: true }, // On inclut les données de l'utilisateur
        },
      },
    });

    // ✅ On vérifie que l'utilisateur est dans la liste des participants
    const participantIds = inDb?.participants.map((p) => p.user.id);
    expect(participantIds).toContain(userId);
  });

  it("DELETE retire l'utilisateur des participants", async () => {
    // ✅ Création avec la syntaxe correcte pour la table de jointure explicite
    const participation = await prisma.sessionParticipation.create({
      data: {
        sessionId: (await createSession()).id,
        userId,
      },
    });

    const sessionId = participation.sessionId;

    const res = await fetch(
      `${baseUrl}/api/session/${sessionId}/participate/${userId}`,
      {
        method: "DELETE",
        headers: authHeader(userToken),
      },
    );

    expect(res.ok).toBe(true);

    const inDb = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { participants: true },
    });

    // ✅ Vérifie qu'il n'y a plus de participants
    expect(inDb?.participants).toHaveLength(0);
  });
});
