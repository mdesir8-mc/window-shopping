import { prisma } from "../lib/prisma";
import { HttpError } from "./http";

// Tenancy in this API is enforced per-query, not by middleware: every read and
// write scopes on the owning user. These helpers are the single definition of
// those predicates so the HTTP routes and the MCP tools cannot drift apart.

export async function findOwnedCloset(userId: string, closetId: string) {
  return prisma.closet.findFirst({
    where: {
      id: closetId,
      userId
    },
    include: {
      sections: {
        orderBy: {
          order: "asc"
        },
        include: {
          _count: {
            select: {
              items: true
            }
          }
        }
      },
      _count: {
        select: {
          items: true
        }
      }
    }
  });
}

export async function findOwnedItem(userId: string, itemId: string) {
  return prisma.item.findFirst({
    where: {
      id: itemId,
      closet: {
        userId
      }
    },
    include: {
      closet: {
        select: {
          id: true,
          name: true
        }
      },
      section: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
}

export async function ensureClosetAndSection(
  userId: string,
  closetId: string,
  sectionId?: string | null
) {
  const closet = await prisma.closet.findFirst({
    where: {
      id: closetId,
      userId
    }
  });

  if (!closet) {
    throw new HttpError(404, "Closet not found.");
  }

  if (!sectionId) {
    return { closet, section: null };
  }

  const section = await prisma.section.findFirst({
    where: {
      id: sectionId,
      closetId: closet.id
    }
  });

  if (!section) {
    throw new HttpError(400, "sectionId must belong to the target closet.");
  }

  return { closet, section };
}
